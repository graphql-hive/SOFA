import { createGraphQLError } from 'graphql-yoga';

const pizzas = [
  { id: 1, dough: 'THICK', toppings: ['cheese'] },
  { id: 2, dough: 'THIN', toppings: ['ham'] },
];
const books = [
  { id: 1, title: 'Book A', type: 'AUDIO' },
  { id: 2, title: 'Book B', type: 'LEGACY' },
];
const users = [
  {
    id: 1,
    name: 'User A',
    favoritePizza: pizzas[0],
    favoriteBook: books[0],
    favoriteFood: pizzas[1],
    shelf: books,
  },
  {
    id: 2,
    name: 'User B',
    favoritePizza: pizzas[1],
    favoriteBook: books[1],
    favoriteFood: {
      ingredients: [
        'green shit',
        'chicken',
        'green shit',
        'yellow shit',
        'red shit',
      ],
    },
    shelf: books,
  },
];

const posts = [
  {
    comments: ['Foo', 'Bar', 'Baz', 'Foo Bar', 'Foo Baz', 'Bar Baz'],
  },
];

export const UsersCollection = {
  get(id: string | number) {
    const uid = typeof id === 'string' ? parseInt(id, 10) : id;

    const user = users.find((u) => u.id === uid);
    if (!user) {
      return createGraphQLError('User not found', {
        extensions: {
          http: {
            status: 404,
          },
        },
      });
    }
    return user;
  },
  all() {
    return users;
  },
};

export const BooksCollection = {
  get(id: string | number) {
    const bid = typeof id === 'string' ? parseInt(id, 10) : id;
    const book = books.find((u) => u.id === bid);
    if (!book) {
      return createGraphQLError('Book not found', {
        extensions: {
          http: {
            status: 404,
          },
        },
      });
    }
    return book;
  },
  all() {
    return books;
  },
  add(title: string) {
    const book = {
      id: parseInt(Math.random().toString(10).substr(2), 10),
      title,
      type: 'LEGACY',
    };

    books.push(book);

    return book;
  },
};

export const PostsCollection = {
  all() {
    return posts;
  },
};
