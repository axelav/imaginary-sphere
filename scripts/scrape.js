const { resolve } = require('path')
const { readdir, readFile, writeFile } = require('fs').promises
const { JSDOM } = require('jsdom')
const { DateTime } = require('luxon')

const timestampToISO = str => DateTime.fromFormat(
  str.trim().replace(/(?<=[0-9])(?:st|nd|rd|th)/, ''),
  'MMMM d, yyyy h:mma'
).toISO()

const sortByTimestamp = data => {
  return [...data].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0
  )

}

const getFiles = async (dir) => {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = resolve(dir, dirent.name)
      return dirent.isDirectory() ? getFiles(res) : res
    })
  )
  return files.flat()
}

const getFileContents = async (file) => {
  const contents = await readFile(file)

  return contents.toString()
}

const getPost = (contents) => {
  const dom = new JSDOM(contents)

  const imgSrc = dom.window.document.querySelector('img').src
  const caption = dom.window.document.querySelector('.caption')?.textContent
  const timestamp = dom.window.document.querySelector('#timestamp').textContent

  return {
    imgSrc: imgSrc.replace(/^\.\.\/\./, ''),
    caption,
    timestamp: timestampToISO(timestamp),
  }
}

const main = async () => {
  const files = await getFiles(__dirname + '/../posts/html')

  const data = await Promise.all(
    files.map(async (file) => {
      const contents = await getFileContents(file)

      return getPost(contents)
    })
  )

  await writeFile(__dirname + '/../data.json', JSON.stringify(sortByTimestamp(data)))
}

main()
