import React, { useState } from 'react'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import LoginForm from './components/LoginForm'
import { useQuery, useMutation, useSubscription, useApolloClient } from 'react-apollo'
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

const USER = gql`
query {
  me {
    username
    favorite
  }
}
`

const BOOK_ADDED = gql`
  subscription {
    bookAdded{
      title
      author {
        name
        born
      }
      published
      genres
      id
    }
  }
`

const ALL_BOOKS = gql`
{
  allBooks {
    title
    author {
      name
      born
    }
    published
    genres
    id
  }
}
`
const BOOKS_BY_GENRE = gql`
  query genreBooks($genre: String!) {
  allBooks(genre: $genre) {
    title
    author {
      name
      born
    }
    published
    genres
    id
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
      author {
        name
        born
      }
      genres
    }
  }
`
const LOGIN = gql`
  mutation login($username: String!, $password: String!){
    login(username: $username, password: $password){
      value
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
const MAKE_FAVORITE = gql`
  mutation addFavorite($favorite: String!) {
    addFavorite(favorite: $favorite) {
      username
      favorite
    }
  }
`

const App = () => {
  const [page, setPage] = useState('authors')
  const [errorMessage, setErrorMessage] = useState(null)
  const [token, setToken] = useState(null)
  const [genreFilter, setGenreFilter] = useState({g: ""})
  const authors = useQuery(ALL_AUTHORS)
  const books = useQuery(ALL_BOOKS)
  const user = useQuery(USER)
  
  const filteredBooks = useQuery(BOOKS_BY_GENRE, {
    variables: {genre: genreFilter.g}
  })


  const notify = (message) => {
    setErrorMessage(message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000)
  }

  const client = useApolloClient()

  const updateCacheWith = (addedBook) => {
    const includedIn = (set, object) => set.map(p => p.id).includes(object.id)  

    const dInStoreAll = client.readQuery({ query: ALL_BOOKS })
    
    const dInStoreFiltered = client.readQuery({ query: BOOKS_BY_GENRE,
      variables: {genre: ""} })

    console.log(dInStoreAll.allBooks)
    if (!includedIn(dInStoreAll.allBooks, addedBook)) {
      console.log(dInStoreAll.allBooks)
      dInStoreAll.allBooks.push(addedBook)
      dInStoreFiltered.allBooks.push(addedBook)
      client.writeQuery({
        query: ALL_BOOKS,
        data: dInStoreAll
      })
      client.writeQuery({
        query: BOOKS_BY_GENRE,
        data: dInStoreFiltered
      })
    }   
  }


  useSubscription(BOOK_ADDED, {
    onSubscriptionData: ({ subscriptionData }) => {
      const addedBook = subscriptionData.data.bookAdded
      notify(`${addedBook.title} added`)
      updateCacheWith(addedBook)
    }
  })

  const handleError = (error) => {
    setErrorMessage(error.graphQLErrors[0].message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000)
  }

  const logout = () => {
    setToken(null)
    localStorage.clear()
    client.resetStore()
  }


  const errorNotification = () => errorMessage &&
  <div style={{ color: 'red' }}>
    {errorMessage}
  </div>

  const [addBook] = useMutation(CREATE_BOOK, {
    onError: handleError,
    update: (store, response) => {
      updateCacheWith(response.data.addPerson)
    }
  })

  const [makeFavorite] = useMutation(MAKE_FAVORITE, {
    onError: handleError,
    refetchQueries: [{ query: ALL_AUTHORS}, {query: ALL_BOOKS}, {query: USER}]
  })

  const [loginUser] = useMutation(LOGIN, {
    onError: handleError,
    update: (store, response) => {
      user.refetch()
      const dataInStore = store.readQuery({query: USER})
      console.log(dataInStore)
      console.log(response.data)
      dataInStore.user.push(response.data.user)
      store.writeQuery({
        query: USER,
        data: dataInStore
      })
    }
    // refetchQueries: [{ query: ALL_AUTHORS}, {query: ALL_BOOKS}, {query: USER} ]
  })

  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    onError: handleError,
    refetchQueries: [{ query: ALL_AUTHORS}, {query: ALL_BOOKS}, {query: USER}]

  })

    if (!token) {
    return ( 
      <div>
        <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button onClick={() => setPage('login')}>login</button>
      </div>
        {errorNotification()}

      <Authors
        authors = {authors}
        editAuthor = { editAuthor } 
        show={page === 'authors'}
      />

      <Books
        books = { books }
        show = {page === 'books'}
        page = {page}
        fax = { filteredBooks }
        filter = {genreFilter.g}
        setGenreFilter = {(filter) => setGenreFilter(filter)}
        user = {user}
      />

      <LoginForm 
          login = {loginUser}
          setToken = {(token) => setToken(token)}
          show={page === 'login'}
          refetchUser = {() => user.refetch()}
          />
      </div>
    )
  }



  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button onClick={() => setPage('add')}>add book</button>
        <button onClick={() => {
          setPage('recommendations')
          setGenreFilter({g: user.data.me.favorite})
        }
          }>recommendations</button>
        <button onClick={() => logout()}>logout</button>

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
        fax = { filteredBooks }
        filter = {genreFilter.g}
        page = {page}
        setGenreFilter = {(filter) => setGenreFilter(filter)}
        show= {page === 'books' || page === 'recommendations'}
        makeFavorite = { makeFavorite }
        user = {user}

      />

      <NewBook
        addBook = { addBook } 
        refetchBooks = {() => books.refetch()}
        refetchFilteredBooks ={() => filteredBooks.refetch()}
        show={page === 'add'}
      />

    </div>
  )
}

export default App