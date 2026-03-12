import { createServer } from 'http';
import { Response } from 'fets';
import { createYoga, createSchema } from 'graphql-yoga';
import chalk from 'chalk';
import { typeDefs } from './types';
import { resolvers } from './resolvers';

// Sofa

import { useSofa } from '../src';

const schema = createSchema({
  typeDefs,
  resolvers,
});

const app = useSofa({
  basePath: '',
  schema,
  ignore: ['User.favoriteBook'],
  openAPI: {
    info: {
      title: 'Example API',
      description: 'Example API Description',
      version: '3.0.0',
    },
  },
  scalarUI: {
    theme: 'saturn',
  },
  routes: {
    'Query.me': {
      description: 'Returns the current user',
      tags: ['User'],
    },
    'Query.users': {
      description: 'Returns a list of all users',
      tags: ['User'],
    },
    'Query.user': {
      description: 'Returns a user by ID',
    },
    'Query.books': {
      description: 'Returns a list of all books',
    },
    'Query.book': {
      description: 'Returns a book by ID',
    },
  },
});

app.route({
  path: '/collect-book',
  method: 'POST',
  async handler(req) {
    const body = await req.json();
    console.log('Received a webhook', body);

    return new Response(null, {
      status: 200,
      statusText: 'OK',
    });
  },
});

const yoga = createYoga({
  schema,
});

app.route({
  path: yoga.graphqlEndpoint,
  handler: yoga as any,
});

const port = 4000;

const server = createServer(app);

server.listen(port, () => {
  const url = `http://localhost:${4000}`;

  function printUrl(path: string) {
    return chalk.gray(url + path);
  }

  console.log(`
    ${chalk.bold('Swagger UI:')}     ${printUrl('/docs')}
    ${chalk.bold('Scalar UI:')}      ${printUrl('/api-reference')}
    ${chalk.bold('GraphiQL:')}        ${printUrl('/graphql')}

    ${chalk.bold('Queries:')}
      me:           ${printUrl('/me')}
      users:        ${printUrl('/users')}
      user:         ${printUrl('/user/1')}
      books:        ${printUrl('/books')}
      book:         ${printUrl('/book/1')}

    ${chalk.bold('Mutations:')}
      addBook:      ${printUrl('/add-book')} ${chalk.italic.gray(
        'POST: {title}'
      )}
  `);
});
