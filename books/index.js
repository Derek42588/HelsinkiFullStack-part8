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
      favorite: String
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
        addFavorite(
          favorite: String!
        ): User
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
      allBooks: async (root, args) => {
          if (!args.author && !args.genre) {
              return Book.find({})
          } else if (args.author && !args.genre) {
            const author = await Author.findOne({name: args.author})
            console.log(author)
          return Book.find({author: { $in: author.id } } )
          } else if (args.genre && !args.author) {
            return Book.find({ genres: { $in: args.genre}})
          } else {
              const author = await Author.findOne({name: args.author})
              return Book.find({author: {$in: author.id}, genres: {$in: args.genre}})
          }
      },
      allAuthors: () => Author.find({}),
    },
    Author: {
        bookCount: async (root) => {
          const books = await Book.find({author: { $in: root.id } } )
          return books.length
        }
    },
    Book: {
      author: (root) => {
        return Author.findOne({_id: root.author})
      }
    },
    Mutation: {
        addBook: async (root, args, context) => {
          const author = await Author.findOne({name: args.author})

          const book = new Book({
            title: args.title,
            published: args.published,
            genres: args.genres,
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
        editAuthor: async (root, args, context) => {
            const author = await Author.findOne({name: args.name})
            author.born = args.setBornTo

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
        },
        addFavorite: async (root, args, { currentUser } ) => {
          if (!currentUser) {
            throw new AuthenticationError("not authenticated")
          }

          currentUser.favorite = args.favorite

          console.log(currentUser)
          
          await currentUser.save()
          return currentUser
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
  