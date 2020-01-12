import React from 'react'
import {pipe, uniq, unnest, values } from 'ramda'

const Books = ({ show, books, setGenreFilter, fax, filter, user, makeFavorite, page }) => {

  if (!show) {
    return null
  }

  if (books.loading) {
    return <div>loading...</div>
  }

  if (fax.loading) {
    return <div>loading...</div>
  }

  const allGenres = books.data.allBooks.map(a => a.genres)

  const uniqueGenres = pipe(
    values,
    unnest,
    uniq
  )

  const uniques = (uniqueGenres(allGenres))
  
  const submit = async () => {

    await makeFavorite({
      variables: { favorite: filter }
    })

  }


  const userData = () => {
    if ((user.data.me === null) || user.data.me.favorite === null ) {
      if (filter === "") {
        return null
      } else {
        return (
          <div>
             Books in genre <strong>{filter}</strong>
          </div>
        )
      }
    } else {
      if (filter === "") {
        return (
            <div>
              {user.data.me.username}'s current favorite genre: <strong>{user.data.me.favorite}</strong>
            </div>
        )
      } else {
        return (
          <div>
            <div>
              {user.data.me.username}'s current favorite genre: <strong>{user.data.me.favorite}</strong>
            </div>
            <div>
              Books in genre <strong>{filter}</strong>
              {user.data.me.favorite === filter ?
              null:
              <button onClick={() => submit()}>make favorite</button>
              }
            </div>
          </div>
        )
      }
    }
  }

if (page === 'books') {

  return (
    <div>
      <h2>books</h2>
      {userData()}

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              author
            </th>
            <th>
              published
            </th>
          </tr>
          {fax.data.allBooks.map(a => 
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div>
      {uniques.map(g => 
        <button key = {g} 
        onClick={() => setGenreFilter({g})}>{g}</button>
          )
        }
        <button onClick = {() => setGenreFilter({g: ""})}>all books</button>
      </div>
    </div>
  )
} else if (page === 'recommendations') {
  return (
    <div>
      <h2>recommendations</h2>
      <div>books in your favorite genre <strong>{user.data.me.favorite}</strong></div>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              author
            </th>
            <th>
              published
            </th>
          </tr>
          {fax.data.allBooks.map(a => 
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div>
      {uniques.map(g => 
        <button key = {g} 
        onClick={() => setGenreFilter({g})}>{g}</button>
          )
        }
        <button onClick = {() => setGenreFilter({g: ""})}>all books</button>
      </div>
    </div>
  )
}
}
export default Books