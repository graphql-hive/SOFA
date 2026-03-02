import {
  GraphQLObjectType,
  GraphQLInputObjectType,
} from 'graphql';

import { buildSchemaObjectFromType } from '../../src/open-api/types';

import { GraphQLEmailAddress, GraphQLPositiveInt } from 'graphql-scalars';

import { createSchema } from 'graphql-yoga';

test('handle ObjectType', async () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      """
      Address Object
      """
      type Address {
        """
        Street Name
        """
        street: String
        city: String
      }

      type Profile {
        email: EmailAddress!
        address: [Address]
      }

      enum UserRole {
        ADMIN
        NORMAL
      }

      type User {
        role: UserRole!
        name: String!
        age: PositiveInt!
        profile: Profile
        """
        User's birthday
        """
        birthday: Date!
        """
        User's registration date
        """
        registrationDate: Date!
      }

      input UserInput {
        name: String!
        age: PositiveInt!
        profile: Profile
      }

      scalar Date
      scalar EmailAddress
      scalar PositiveInt
    `,
    resolvers: {
      EmailAddress: GraphQLEmailAddress,
      PositiveInt: GraphQLPositiveInt,
    },
  });

  const userType = schema.getType('User') as GraphQLObjectType;
  const profileType = schema.getType('Profile') as GraphQLObjectType;
  const addressType = schema.getType('Address') as GraphQLObjectType;
  const userInputType = schema.getType('UserInput') as GraphQLInputObjectType;

  const customScalars = { Date: { type: 'string', format: 'date' } };
  const user = buildSchemaObjectFromType(userType, { customScalars });
  const profile = buildSchemaObjectFromType(profileType, { customScalars });
  const address = buildSchemaObjectFromType(addressType, { customScalars });
  const userInput = buildSchemaObjectFromType(userInputType, { customScalars });

  expect(user).toEqual({
    type: 'object',
    required: ['role', 'name', 'age', 'birthday', 'registrationDate'],
    properties: {
      role: {
        enum: ['ADMIN', 'NORMAL'],
        type: 'string',
      },
      name: {
        type: 'string',
      },
      age: {
        type: 'integer',
        minimum: 1,
        title: 'PositiveInt',
      },
      birthday: {
        type: 'string',
        format: 'date',
        description: "User's birthday",
      },
      registrationDate: {
        type: 'string',
        format: 'date',
        description: "User's registration date",
      },
      profile: {
        $ref: '#/components/schemas/Profile',
      },
    },
  });

  expect(profile).toEqual({
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      address: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Address',
        },
      },
    },
  });

  expect(address).toEqual({
    type: 'object',
    properties: {
      street: {
        type: 'string',
        description: 'Street Name',
      },
      city: {
        type: 'string',
      },
    },
    description: 'Address Object',
  });

  expect(userInput).toEqual({
    type: 'object',
    required: ['name', 'age'],
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'integer',
        minimum: 1,
        title: 'PositiveInt',
      },
      profile: {
        $ref: '#/components/schemas/Profile',
      },
    },
  });
});
