import { buildSchema, Kind, OperationTypeNode } from 'graphql';

import { buildPathFromOperation } from '../../src/open-api/operations';
import { buildOperationNodeForField } from '@graphql-tools/utils';

const schema = buildSchema(/* GraphQL */ `
  type Post {
    comments(filter: String!, date: Date): [String!]!
    author: Author
    postId: Int
    type: PostType
  }

  enum PostType {
    BLOG
    QUESTION
  }

  type Author {
    authorId: Int
  }

  type Image {
    url: String
  }

  type Gallery {
    id: ID
    name: String
    images: [Image!]!
  }

  union Inspiration = Post | Gallery

  type Query {
    """
    Feed of posts
    """
    feed(
      """
      The post type
      """
      type: PostType
    ): [Post]

    """
    Random post or gallery
    """
    inspiration: Inspiration
  }

  scalar Date

  type Mutation {
    addPost(
      comments: [String!]!
      date: Date
      """
      The post type
      """
      type: PostType
    ): Post

    addPostComments(id: ID!, comments: [String!]): Post
  }
`);

test('handle query', async () => {
  const operation = buildOperationNodeForField({
    schema,
    kind: 'query' as OperationTypeNode,
    field: 'feed',
    models: [],
    ignore: [],
  });

  const result = buildPathFromOperation({
    url: '/api/feed',
    operation: {
      kind: Kind.DOCUMENT,
      definitions: [operation],
    },
    schema,
    useRequestBody: false,
    customScalars: {
      Date: { type: 'string', format: 'date' },
    },
  });
  expect(result.operationId).toEqual('feed_query');
  expect(result.parameters?.length).toEqual(3);
  expect(result.parameters?.[0]).toEqual({
    in: 'query',
    name: 'type',
    required: false,
    schema: {
      type: 'string',
      enum: ['BLOG', 'QUESTION'],
    },
    description: 'The post type',
  });
  expect(result.parameters?.[1]).toEqual({
    in: 'query',
    name: 'feed_comments_filter',
    required: true,
    schema: {
      type: 'string',
    },
  });
  expect(result.parameters?.[2]).toEqual({
    in: 'query',
    name: 'feed_comments_date',
    required: false,
    schema: {
      type: 'string',
      format: 'date',
    },
  });

  expect((result.responses[200] as any).description).toMatch('Feed of posts');

  const response = (result.responses[200] as any).content['application/json']
    .schema;
  expect(response).toEqual({
    type: 'array',
    items: { $ref: '#/components/schemas/Post' },
  });
});

test('handle mutation', async () => {
  const operation = buildOperationNodeForField({
    schema,
    kind: 'mutation' as OperationTypeNode,
    field: 'addPost',
    models: [],
    ignore: [],
  });

  const result = buildPathFromOperation({
    url: '/api/add-post',
    operation: {
      kind: Kind.DOCUMENT,
      definitions: [operation],
    },
    schema,
    useRequestBody: true,
    customScalars: {
      Date: { type: 'string', format: 'date' },
    },
  });

  // id
  expect(result.operationId).toEqual('addPost_mutation');

  // params
  expect(result.parameters?.length).toEqual(0);

  // request body
  const def = (result.requestBody as any).content['application/json'].schema;

  expect(result.requestBody).toBeDefined();
  expect(def.type).toEqual('object');
  expect(def.required).toEqual(['comments', 'addPost_comments_filter']);
  expect(def.properties!.comments).toEqual({
    type: 'array',
    items: {
      type: 'string',
    },
  });
  expect(def.properties!.date).toEqual({
    type: 'string',
    format: 'date',
  });
  expect(def.properties!.type).toEqual({
    type: 'string',
    enum: ['BLOG', 'QUESTION'],
    description: 'The post type',
  });
});

test('handle tags and descriptions', async () => {
  const operation = buildOperationNodeForField({
    schema,
    kind: 'query' as OperationTypeNode,
    field: 'feed',
  });
  const result = buildPathFromOperation({
    url: '/api/feed',
    operation: {
      kind: Kind.DOCUMENT,
      definitions: [operation],
    },
    tags: ['Feed', 'Posts', 'Test'],
    description: 'Feed for test posts',
    schema,
    useRequestBody: false,
    customScalars: {},
  });
  expect(result.description).toMatch('Feed for test posts');
  expect(result.tags).toContain('Feed');
  expect(result.tags).toContain('Posts');
  expect(result.tags).toContain('Test');
});

test('handle query params in POST requests', async () => {
  const operation = buildOperationNodeForField({
    schema,
    kind: 'mutation' as OperationTypeNode,
    field: 'addPostComments',
    models: [],
    ignore: [],
  });

  const result = buildPathFromOperation({
    url: '/api/posts/{id}/comments',
    operation: {
      kind: Kind.DOCUMENT,
      definitions: [operation],
    },
    schema,
    useRequestBody: true,
    customScalars: {
      Date: { type: 'string', format: 'date' },
    },
  });

  // id
  expect(result.operationId).toEqual('addPostComments_mutation');

  // params
  expect(result.parameters?.length).toEqual(1);
  expect(result.parameters?.[0]).toEqual({
    in: 'path',
    name: 'id',
    required: true,
    schema: {
      type: 'string',
    },
  });

  // request body
  const def = (result.requestBody as any).content['application/json'].schema;

  expect(result.requestBody).toBeDefined();
  expect(def.id).not.toBeDefined();
  expect(def.type).toEqual('object');
  expect(def.required).toEqual(['addPostComments_comments_filter']);
  expect(def.properties!.comments).toEqual({
    type: 'array',
    items: {
      type: 'string',
    },
  });
});

test('handle union type', async () => {
  const operation = buildOperationNodeForField({
    schema,
    kind: 'query' as OperationTypeNode,
    field: 'inspiration',
    models: [],
    ignore: [],
  });

  const result = buildPathFromOperation({
    url: '/api/inspiration',
    operation: {
      kind: Kind.DOCUMENT,
      definitions: [operation],
    },
    schema,
    useRequestBody: false,
    customScalars: {
      Date: { type: 'string', format: 'date' },
    },
  });
  expect(result.operationId).toEqual('inspiration_query');
  expect(result.parameters?.length).toEqual(2);
  expect(result.parameters?.[0]).toEqual({
    in: 'query',
    name: 'inspiration_comments_filter',
    required: true,
    schema: {
      type: 'string',
    },
  });
  expect(result.parameters?.[1]).toEqual({
    in: 'query',
    name: 'inspiration_comments_date',
    required: false,
    schema: {
      type: 'string',
      format: 'date',
    },
  });

  expect((result.responses[200] as any).description).toMatch(
    'Random post or gallery'
  );

  const response = (result.responses[200] as any).content['application/json']
    .schema;
  expect(response).toEqual({
    oneOf: [
      { $ref: '#/components/schemas/Post' },
      { $ref: '#/components/schemas/Gallery' },
    ],
  });
});
