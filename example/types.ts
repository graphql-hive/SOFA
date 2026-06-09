export const typeDefs = /* GraphQL */ `
  enum Dough {
    THIN
    THICK
  }

  type Pizza {
    dough: Dough!
    toppings: [String!]
  }

  type Salad {
    ingredients: [String!]!
  }

  union Food = Pizza | Salad

  type Book {
    id: ID!
    title: String!
    type: BookType!
  }

  enum BookType {
    AUDIO
    LEGACY
  }

  """
  A User type represents a user in the system. It contains information about the user's name, their favorite pizza, book, and food, as well as a shelf of books they own.
  \`Lorem Ipsum\` is simply dummy text of the printing and typesetting industry. It has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
  """
  type User {
    id: ID!
    name: String!
    favoritePizza: Pizza!
    favoriteBook: Book!
    favoriteFood: Food!
    shelf: [Book!]!
  }

  type Post {
    comments(filter: String!): [String!]
  }

  type Query {
    """
    Resolves current user
    """
    me: User
    user(id: ID!): User
    users: [User!]
    usersLimit(limit: Int!): [User!]
    usersSort(sort: Boolean!): [User!]
    book(id: ID!): Book
    books: [Book!]
    never: String
    feed: [Post]
  }

  type Mutation {
    addBook(title: String!): Book
  }

  type Subscription {
    onBook: Book
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;
