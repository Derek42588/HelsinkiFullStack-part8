const config = require('./utils/config')
const { ApolloServer, AuthenticationError, UserInputError, gql } = require('apollo-server')
const uuid = require ('uuid/v1')
const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require ('./models/author')
const User = require ('./models/user')
const jwt = require ('jsonwebtoken')

mongoose.set('useFindAndModify', false)

console.log('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })


let authors = [
    {
      name: 'Robert Martin',
      id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
      born: 1952,
    },
    {
      name: 'Martin Fowler',
      id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
      born: 1963
    },
    {
      name: 'Fyodor Dostoevsky',
      id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
      born: 1821
    },
    { 
      name: 'Joshua Kerievsky', // birthyear not known
      id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
    },
    { 
      name: 'Sandi Metz', // birthyear not known
      id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
    },
  ]
  
  /*
   * It would be more sensible to assosiate book and the author by saving 
   * the author id instead of the name to the book.
   * For simplicity we however save the author name.
  */
  
  let books = [
    {
      title: 'Clean Code',
      published: 2008,
      author: 'Robert Martin',
      id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
      genres: ['refactoring']
    },
    {
      title: 'Agile software development',
      published: 2002,
      author: 'Robert Martin',
      id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
      genres: ['agile', 'patterns', 'design']
    },
    {
      title: 'Refactoring, edition 2',
      published: 2018,
      author: 'Martin Fowler',
      id: "afa5de00-344d-11e9-a414-719c6709cf3e",
      genres: ['refactoring']
    },
    {
      title: 'Refactoring to patterns',
      published: 2008,
      author: 'Joshua Kerievsky',
      id: "afa5de01-344d-11e9-a414-719c6709cf3e",
      genres: ['refactoring', 'patterns']
    },  
    {
      title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
      published: 2012,
      author: 'Sandi Metz',
      id: "afa5de02-344d-11e9-a414-719c6709cf3e",
      genres: ['refactoring', 'design']
    },
    {
      title: 'Crime and punishment',
      published: 1866,
      author: 'Fyodor Dostoevsky',
      id: "afa5de03-344d-11e9-a414-719c6709cf3e",
      genres: ['classic', 'crime']
    },
    {
      title: 'The Demon',
      published: 1872,
      author: 'Fyodor Dostoevsky',
      id: "afa5de04-344d-11e9-a414-719c6709cf3e",
      genres: ['classic', 'revolution']
    },
  ]
  
  const typeDefs = gql`
    type Book {
        title: String!
        published: Int!
        author: Author!
        id: ID!
        genres: [String!]!
    }

    type User {
      username: String!
      id: ID!
    }
    type Token {
      value: String!
    }

    type Author {
        name: String!
        id: ID!
        born: Int
        bookCount: Int!
    }
    
    type Query {
      hello: String!
      bookCount: Int!
      authorCount: Int!
      allBooks(author: String, genre: String): [Book!]!
      allAuthors: [Author!]!
      me: User
    }
    type Mutation {
        createUser(
          username: String!
        ): User
        login(
          username: String!
          password: String!
        ): Token
        addBook(
            title: String!
            published: Int!
            author: String!
            genres: [String!]!
        ): Book
        editAuthor(
            name: String!
            setBornTo: Int!
        ): Author
    }

  `
  
  const resolvers = {
    Query: {
      hello: () => { return "world" },
      bookCount: () => Book.collection.countDocuments(),
      authorCount: () => Author.collection.countDocuments(),
      me: (root, args, context) => {
        return context.currentUser
      },
      allBooks: (root, args) => {
          if (!args.author && !args.genre) {
              return Book.find({})
          } else if (args.author && !args.genre) {
          return Book.find({author: { $in: args.author } } )
          } else if (args.genre && !args.author) {
            return Book.find({ genres: { $in: args.genre}})
          } else {
              return books.filter( b => b.author === args.author && b.genres.includes(args.genre))
          }
      },
      allAuthors: () => Author.find({}),
    },
    Author: {
        bookCount: (root) => {
          return Book.find({author: { $in: root.name } }).length
        }
    },
    Mutation: {
        addBook: async (root, args, context) => {

          const author = await Author.findOne({name: args.author})
          const book = new Book({
            title: args.title,
            published: args.published,
            genres: args.genre
          })
          
          const currentUser = context.currentUser
          if (!currentUser) {
            throw new AuthenticationError("not authenticated")
          }

          if (!author) {
            const newAuthor = new Author({
              name: args.author
            })
            await newAuthor.save()
            book.author = newAuthor
            

          } else {
           book.author = author
          }

          
          try {
            await book.save()
          } catch (error) {
            throw new UserInputError (error.message, {
              invalidArgs: args,
            })
          }

          return book
        },
        editAuthor: async (root, args) => {
            const author = await Author.findOne({name: args.name})
            author.born = args.born

            const currentUser = context.currentUser
            if (!currentUser) {
              throw new AuthenticationError("not authenticated")
            }
            
            try {
              await author.save()
            } catch (error) {
              throw new UserInputError (error.message, {
                invalidArgs: args,
              })
            }
            return author
        },
        createUser: (root, args) => {
          const user = new User({ username: args.username })

          return user.save()
            .catch(error => {
              throw new UserInputError(error.message, {
                invalidArgs: args,
              })
            })
        },
        login: async (root, args) => {
          const user = await User.findOne({ username: args.username })
          if (!user || args.password !== 'password') {
            throw new UserInputError("wrong credentials")
          }

          const userForToken = {
            username: user.username,
            id: user._id
          }

          return { value: jwt.sign(userForToken, process.env.SECRET)}
        }
    }
  }
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async({ req }) => {
      const auth = req ? req.headers.authorization: null
      if (auth && auth.toLowerCase().startsWith('bearer ')) {
        const decodedToken = jwt.verify(
          auth.substring(7), process.env.SECRET
        )
        const currentUser = await User.findById(decodedToken.id)
        return { currentUser } 
      }
    }
  })
  
  server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`)
  })
  