jest.mock('@whatwg-node/fetch', () => {
  const original = jest.requireActual('@whatwg-node/fetch'); // Step 2.
  return {
    ...original,
    fetch: jest.fn().mockResolvedValue({
      text: () => ({}),
    }),
  };
});

import { fetch } from '@whatwg-node/fetch';
import { createSchema, createPubSub, filter, pipe } from 'graphql-yoga';
import { useSofa } from '../src';

const delay = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const testBook1 = {
  id: 'book-id-1',
  title: 'Test Book 1',
  author: 'Test Author 1',
};
const testBook2 = {
  id: 'book-id-2',
  title: 'Test Book 2',
  author: 'Test Author 2',
};
const BOOK_ADDED = 'BOOK_ADDED';
const typeDefs = /* GraphQL */ `
  type Book {
    id: ID!
    title: String!
    author: String!
  }
  type Subscription {
    onBook: Book!
    onBookBy(author: String!): Book!
  }
  type Query {
    books: [Book!]
  }
`;

test('should start subscriptions', async () => {
  (fetch as jest.Mock).mockClear();
  const pubsub = createPubSub();
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs,
      resolvers: {
        Subscription: {
          onBook: {
            subscribe: () => pubsub.subscribe(BOOK_ADDED),
          },
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/webhook', {
    method: 'POST',
    body: JSON.stringify({
      subscription: 'onBook',
      url: '/book',
    }),
  });

  expect(res.status).toBe(200);
  const resBody = await res.json();
  expect(resBody).toEqual({ id: expect.any(String) });
  pubsub.publish(BOOK_ADDED, { onBook: testBook1 });
  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        onBook: {
          id: 'book-id-1',
          title: 'Test Book 1',
          author: 'Test Author 1',
        },
      },
    }),
  });
  pubsub.publish(BOOK_ADDED, { onBook: testBook2 });
  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith('/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        onBook: {
          id: 'book-id-2',
          title: 'Test Book 2',
          author: 'Test Author 2',
        },
      },
    }),
  });
});

test('should stop subscriptions', async () => {
  (fetch as jest.Mock).mockClear();
  const pubsub = createPubSub();
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs,
      resolvers: {
        Subscription: {
          onBook: {
            subscribe: () => pubsub.subscribe(BOOK_ADDED),
          },
        },
      },
    }),
  });

  const res = await sofa.fetch('http://localhost:4000/api/webhook', {
    method: 'POST',
    body: JSON.stringify({
      subscription: 'onBook',
      url: '/book',
    }),
  });
  expect(res.status).toBe(200);
  const resBody = await res.json();
  pubsub.publish(BOOK_ADDED, { onBook: testBook1 });
  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
  const deleteRes = await sofa.fetch(
    `http://localhost:4000/api/webhook/${resBody.id}`,
    {
      method: 'DELETE',
    }
  );
  expect(deleteRes.status).toBe(200);
  pubsub.publish(BOOK_ADDED, { onBook: testBook2 });
  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('should start subscriptions with parameters', async () => {
  (fetch as jest.Mock).mockClear();
  const pubsub = createPubSub();
  const sofa = useSofa({
    basePath: '/api',
    schema: createSchema({
      typeDefs,
      resolvers: {
        Subscription: {
          onBookBy: {
            subscribe: (root, args, context, info) =>
              pipe(
                pubsub.subscribe(BOOK_ADDED),
                filter((payload) => payload.onBookBy.author === args.author)
              ),
          },
        },
      },
    }),
  });

  const response = await sofa.fetch('http://localhost:4000/api/webhook', {
    method: 'POST',
    body: JSON.stringify({
      subscription: 'onBookBy',
      url: '/bookBy',
      variables: { author: 'Test Author 1' },
    }),
  });
  expect(response.status).toBe(200);
  const resBody = await response.json();
  expect(resBody).toEqual({ id: expect.any(String) });
  pubsub.publish(BOOK_ADDED, { onBookBy: testBook1 });
  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('/bookBy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        onBookBy: {
          id: 'book-id-1',
          title: 'Test Book 1',
          author: 'Test Author 1',
        },
      },
    }),
  });
  pubsub.publish(BOOK_ADDED, { onBookBy: testBook2 });
  await delay(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
});
