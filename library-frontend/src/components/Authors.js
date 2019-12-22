import React, { useState } from 'react'

const Authors = ({ authors, show, editAuthor }) => {

  const [name, setName] = useState('')
  const [bornString, setBornString] = useState('')

  const [selectedOption, setSelectedOption] = useState('')


  if (!show) {
    return null
  }
  if (authors.loading) {
    return <div>loading...</div>
  }

  

  const submit = async (e) => {
    e.preventDefault()
    const born = Number(bornString)
    await editAuthor({
      variables: {name, born }
    })

    setName('')
    setBornString('')

  }

  const handleChange = event => {
    setSelectedOption(  event.target.value )
    setName(event.target.value)
  }

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              born
            </th>
            <th>
              books
            </th>
          </tr>
          {authors.data.allAuthors.map(a =>
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          )}
        </tbody>
      </table>
      
      <form onSubmit={submit}>
      <select value = {selectedOption} onChange = {handleChange}>
        {authors.data.allAuthors.map(a =>
        <option key = {a.name} value = {a.name}>{a.name}</option>
        )}
      </select>
          <div>
            born <input
              value={bornString}
              onChange={({ target }) => setBornString(target.value)}
            />
          </div>
          <button type='submit'>change birthyear</button>
        </form>
    </div>
  )
}

export default Authors