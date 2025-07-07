import { Response } from 'fets';
import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { useSofa } from '../src';

test('should work with Query and variables', async () => {
  const testUser = {
    id: 'test-id',
    name: 'Test User',
  };
  const spy = jest.fn(() => testUser);
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID
          name: String
        }
        type Query {
          user(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          user: spy,
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/user/test-id');
  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual(testUser);
  expect((spy.mock.calls[0] as any[])[1]).toEqual({ id: 'test-id' });
});

test('should work with input objects in URL params via GET', async () => {
  const testUser = {
    id: 'test-id',
    name: 'Test User',
  };
  const spy = jest.fn(() => [testUser]);
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID
          name: String
        }

        input UserFilterNestedInput {
          id: ID!
        }

        input UserFilterInput {
          nested: UserFilterNestedInput!
        }

        type Query {
          users(where: UserFilterInput!): [User!]!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    }),
  });

  const res = await sofa.fetch(
    'http://localhost:4000/api/users?where={"nested":{"id":"test-id"}}'
  );
  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual([testUser]);
  expect((spy.mock.calls[0] as any[])[1]).toEqual({
    where: {
      nested: {
        id: testUser.id,
      },
    },
  });
});

test('should work with Mutation', async () => {
  const pizza = { dough: 'dough', toppings: ['topping'] };
  const spy = jest.fn(() => ({ __typename: 'Pizza', ...pizza }));
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Pizza {
          dough: String!
          toppings: [String!]
        }
        type Salad {
          ingredients: [String!]!
        }
        union Food = Pizza | Salad
        type Query {
          pizza: Pizza
        }
        type Mutation {
          addRandomFood: Food
        }
      `,
      resolvers: {
        Mutation: {
          addRandomFood: spy,
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/add-random-food', {
    method: 'POST',
  });
  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual(pizza);
  expect((spy.mock.calls[0] as any[])[1]).toEqual({});
});

test('should work with Mutation + Query', async () => {
  const pizza = { dough: 'dough', toppings: ['topping'] };
  const spy = jest.fn(() => ({ __typename: 'Pizza', query: {}, ...pizza }));
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Pizza {
          dough: String!
          toppings: [String!]
          query: Query
        }
        type Salad {
          ingredients: [String!]!
          query: Query
        }
        union Food = Pizza | Salad
        type Query {
          pizza: Pizza
          getPizzaById(id: String!): Pizza
        }
        type Mutation {
          addRandomFood(name: String!): Food
        }
      `,
      resolvers: {
        Mutation: {
          addRandomFood: spy,
        },
      },
    }),
  });

  const res = await sofa.fetch(
    'http://localhost:4000/api/add-random-food?name=test',
    {
      method: 'POST',
    }
  );
  const resBody = await res.json();
  expect(resBody).toEqual(pizza);
  expect((spy.mock.calls[0] as any[])[1]).toEqual({ name: 'test' });
});

test('should overwrite a default http method on demand', async () => {
  const users = [
    {
      id: 'user:foo',
      name: 'Foo',
    },
  ];

  const spy = jest.fn(() => users);
  const spyMutation = jest.fn(() => users[0]);

  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        input PageInfoInput {
          offset: Int
          limit: Int!
        }

        type User {
          id: ID
          name: String
        }

        type Query {
          users(pageInfo: PageInfoInput!): [User]
        }

        type Mutation {
          addRandomUser: User
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          addRandomUser: spyMutation,
        },
      },
    }),
    routes: {
      'Query.users': { method: 'POST' },
      'Mutation.addRandomUser': { method: 'GET' },
    },
  });

  const params = {
    pageInfo: {
      limit: 5,
    },
  };

  const queryRes = await sofa.fetch('http://localhost:4000/api/users', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  expect(queryRes.status).toBe(200);
  const queryResBody = await queryRes.json();
  expect(queryResBody).toEqual(users);
  expect((spy.mock.calls[0] as any[])[1]).toEqual(params);

  const mutationRes = await sofa.fetch(
    'http://localhost:4000/api/add-random-user',
    {
      method: 'GET',
    }
  );
  expect(mutationRes.status).toBe(200);
  const mutationResBody = await mutationRes.json();
  expect(mutationResBody).toEqual(users[0]);
});

test('should overwrite a default path and responseStatus on demand', async () => {
  const users = [
    {
      id: 'user:foo',
      name: 'Foo',
    },
  ];
  const spy = jest.fn(() => users);
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID
          name: String
        }
        type Query {
          users(offset: Int, limit: Int!): [User]
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    }),
    routes: {
      'Query.users': { path: '/my-users/:offset/:limit', responseStatus: 201 },
    },
  });

  const queryRes = await sofa.fetch('http://localhost:4000/api/my-users/2/5');
  expect(queryRes.status).toBe(201);
  const queryResBody = await queryRes.json();
  expect(queryResBody).toEqual(users);
  expect(spy).toHaveBeenLastCalledWith(
    /* source */ undefined,
    /* args */ { offset: 2, limit: 5 },
    /* context */ expect.anything(),
    /* info */ expect.anything()
  );
});

test('should work with scalars', async () => {
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo() {
            return 'bar';
          },
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/foo');
  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual('bar');
});

test('should support search params in url', async () => {
  const users = [
    {
      id: 'user:foo',
      name: 'Foo',
    },
  ];
  const spy = jest.fn(() => users);

  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID
          name: String
        }
        type Query {
          users(count: Int!): [User]
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/users?count=5');
  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual(users);
  expect(spy).toHaveBeenLastCalledWith(
    /* source */ undefined,
    /* args */ { count: 5 },
    /* context */ expect.anything(),
    /* info */ expect.anything()
  );
});

test('should return errors as json', async () => {
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String!
          bar: String!
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw new GraphQLError('permission denied', {
              extensions: { code: 'PERMISSION_DENIED' },
            });
          },
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/foo');
  expect(res.status).toBe(500);
  const resBody = await res.json();
  expect(resBody).toEqual({
    errors: [
      {
        message: 'permission denied',
        path: ['foo'],
        extensions: { code: 'PERMISSION_DENIED' },
      },
    ],
  });
});

test('should override error response with errorHandler', async () => {
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String!
          bar: String!
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw new GraphQLError('permission denied', {
              extensions: { code: 'PERMISSION_DENIED' },
            });
          },
        },
      },
    }),
    errorHandler(errs) {
      const body = JSON.stringify({ message: errs[0].message });
      let status = 500;
      if (
        errs[0] instanceof GraphQLError &&
        errs[0].extensions.code === 'PERMISSION_DENIED'
      ) {
        status = 403;
      }
      return new Response(body, { status });
    },
  });

  const res = await sofa.fetch('http://localhost:4000/api/foo');
  expect(res.status).toBe(403);
  const resBody = await res.json();
  expect(resBody).toEqual({ message: 'permission denied' });
});

test('should respect http error extensions', async () => {
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String!
          bar: String!
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw new GraphQLError('permission denied', {
              extensions: {
                code: 'PERMISSION_DENIED',
                http: { status: 403, headers: { 'x-foo': 'bar' } },
              },
            });
          },
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/foo');
  expect(res.status).toBe(403);
  expect(res.headers.get('x-foo')).toBe('bar');
  const resBody = await res.json();
  expect(resBody).toEqual({
    errors: [
      {
        message: 'permission denied',
        path: ['foo'],
        extensions: {
          code: 'PERMISSION_DENIED',
        },
      },
    ],
  });
});

// it('should pass field descriptions to onRoute', () => {
//   const spy = jest.fn();
//   useSofa({
//     basePath: '/api',
//     schema: createSchema({
//       typeDefs: /* GraphQL */ `
//         type Query {
//           """
//           this is query
//           """
//           foo: String
//         }
//         type Mutation {
//           """
//           this is mutation
//           """
//           bar(arg1: Int): String
//         }
//       `,
//     }),
//     onRoute: spy,
//   });

//   expect(spy).toHaveBeenCalledTimes(2);
//   expect(spy.mock.calls[0][0].description).toEqual('this is query');
//   expect(spy.mock.calls[1][0].description).toEqual('this is mutation');
// });

test('primitive true boolean in requests should be handled as true', async () => {
  const spyMutation = jest.fn();
  const spyQuery = jest.fn();
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          bar(arg2: Boolean): String
        }
        type Mutation {
          foo(arg1: Boolean): String
        }
      `,
      resolvers: {
        Mutation: {
          foo: spyMutation,
        },
        Query: {
          bar: spyQuery,
        },
      },
    }),
  });

  await sofa.fetch('http://localhost:4000/api/foo', {
    method: 'POST',
    body: JSON.stringify({ arg1: true }),
  });
  expect(spyMutation).toHaveBeenCalledWith(
    /* source */ undefined,
    /* args */ { arg1: true },
    /* context */ expect.anything(),
    /* info */ expect.anything()
  );

  await sofa.fetch('http://localhost:4000/api/bar?arg2=true');
  expect(spyQuery).toHaveBeenCalledWith(
    /* source */ undefined,
    /* args */ { arg2: true },
    /* context */ expect.anything(),
    /* info */ expect.anything()
  );
});

// test('should overwrite field descriptions', () => {
//   const spy = jest.fn();
//   useSofa({
//     basePath: '/api',
//     schema: createSchema({
//       typeDefs: /* GraphQL */ `
//         type Query {
//           """
//           this is query
//           """
//           foo: String
//         }
//         type Mutation {
//           """
//           this is mutation
//           """
//           bar(arg1: Int): String
//         }
//       `,
//     }),
//     onRoute: spy,
//     routes: {
//       'Query.foo': { description: 'this is overwritten query description' },
//       'Mutation.bar': {
//         description: 'this is overwritten mutation description',
//       },
//     },
//   });

//   expect(spy).toHaveBeenCalledTimes(2);
//   expect(spy.mock.calls[0][0].description).toEqual(
//     'this is overwritten query description'
//   );
//   expect(spy.mock.calls[1][0].description).toEqual(
//     'this is overwritten mutation description'
//   );
// });

test('should work with Query and nested models', async () => {
  const testUser = {
    id: 'test-id',
    name: 'Test User',
    org: {
      id: 'test-org',
    },
  };
  const spy = jest.fn(() => testUser);
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Org {
          id: ID
          name: String
        }
        type User {
          id: ID
          name: String
          org: Org
        }
        type Query {
          user(id: ID!): User
          users: [User]
          org(id: ID!): Org
          orgs: [Org]
          orgByName(name: String!): Org
        }
      `,
      resolvers: {
        Query: {
          user: spy,
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/user/test-id');
  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual(testUser);
  expect((spy.mock.calls[0] as any[])[1]).toEqual({ id: 'test-id' });
});

test('should respect tags and descriptions', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        """
        this is query
        """
        foo: String
      }
      type Mutation {
        """
        this is mutation
        """
        bar(arg1: Int): String
      }
    `,
  });

  const sofa = useSofa({
    basePath: '/api',
    schema,
    routes: {
      'Query.foo': { tags: ['foo'], description: 'this is query' },
      'Mutation.bar': { tags: ['bar'], description: 'this is mutation' },
    },
  });

  expect(sofa.openAPIDocument.paths?.['/foo']?.get?.tags).toEqual(['foo']);
  expect(sofa.openAPIDocument.paths?.['/bar']?.post?.tags).toEqual(['bar']);
});

// test('should catch json parsing errors on query params and return Bad Request/400 error', async () => {
//   const spy = jest.fn();
//   const sofa = useSofa({
//     basePath: '/api',
//     schema: createSchema({
//       typeDefs: /* GraphQL */ `
//         type Query {
//           """
//           this is query
//           """
//           foo(arg1: Int): String
//         }
//         type Mutation {
//           """
//           this is mutation
//           """
//           bar(arg1: Int): String
//         }
//       `,
//     }),
//     onRoute: spy,
//   });

//   const res = await sofa.fetch('http://localhost:4000/api/foo?arg1=notanumber');
//   expect(res.status).toBe(400);
//   const resBody = await res.json();
//   expect(resBody).toEqual({
//     errors: [
//       {
//         message: 'Int cannot represent non-integer value: "notanumber"',
//       }
//     ]
//   });
// });

// test('should catch json parsing errors on request body and return Bad Request/400 error', async () => {
//   const spy = jest.fn();

//   const sofa = useSofa({
//     basePath: '/api',
//     schema: createSchema({
//       typeDefs: /* GraphQL */ `
//         type Query {
//           """
//           this is query
//           """
//           foo(arg1: Int): String
//         }
//         type Mutation {
//           """
//           this is mutation
//           """
//           bar(arg1: Int): String
//         }
//       `,
//     }),
//     onRoute: spy,
//   });

//   const res = await sofa.fetch(
//     'http://localhost:4000/api/bar?arg1=notanumber',
//     {
//       method: 'POST',
//       body: JSON.stringify({ count: 'notanumber' }),
//     }
//   );
//   expect(res.status).toBe(400);
//   const resBody = await res.json();
//   expect(resBody).toEqual({
//     errors: [
//       {
//         message: 'Int cannot represent non-integer value: "notanumber"',
//       }
//     ]
//   });
// });
