import React, { useState } from 'react'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import { useQuery, useMutation } from 'react-apollo'
import { gql } from 'apollo-boost'

const ALL_AUTHORS = gql`
{
  allAuthors{
    name
    born
    bookCount
  }
}
`

const ALL_BOOKS = gql`
{
  allBooks {
    title
    author
    published
  }
}
`

const CREATE_BOOK = gql`
  mutation createBook($title: String!, $publishedInt: Int!, $author: String!, $genres: [String!]!) {
    addBook(
      title: $title,
      published: $publishedInt,
      author: $author,
      genres: $genres
    ) {
      title
      published
      id
      author
      genres
    }
  }
`

const EDIT_AUTHOR = gql`
  mutation editAuthor($name: String!, $born: Int!) {
    editAuthor(name: $name, setBornTo: $born) {
      name
      born
      id
      bookCount
    }
  }
`

const App = () => {
  const [page, setPage] = useState('authors')
  const [errorMessage, setErrorMessage] = useState(null)
  const authors = useQuery(ALL_AUTHORS)
  const books = useQuery(ALL_BOOKS)

  const handleError = (error) => {
    if (error.graphQLErrors[0] !== undefined ) {
    setErrorMessage(error.graphQLErrors[0].message)
    } else {
      setErrorMessage(error)
    }
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000)
  }

  const [addBook] = useMutation(CREATE_BOOK, {
    onError: handleError,
    refetchQueries: [{ query: ALL_AUTHORS}, {query: ALL_BOOKS}]
  })

  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    onError: handleError,
    refetchQueries: [{ query: ALL_AUTHORS}, {query: ALL_BOOKS}]

  })

  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button onClick={() => setPage('add')}>add book</button>
      </div>

      {errorMessage &&
      <div style = {{color: 'red'}}>
        {errorMessage}
      </div>
      }

      <Authors
        authors = {authors}
        editAuthor = { editAuthor } 
        show={page === 'authors'}
      />

      <Books
        books = { books }
        show={page === 'books'}
      />

      <NewBook
        addBook = { addBook } 
        show={page === 'add'}
      />

    </div>
  )
}

export default App