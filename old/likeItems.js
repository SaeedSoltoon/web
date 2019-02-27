const instagramUrl = (item = {}) => {
  if (!item.code) return ``
  return `https://instagram.com/p/${item.code}`
}

const userUrl = (item = {}) => {
  if (!item.username) return ``
  return `https://instagram.com/${item.username}`
}

const getURL = (item) => {
  const isUser = !!item.username

  return isUser ? userUrl(item) : instagramUrl(item)
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))


const safeMap = async (items, transform, timeout = 5, n, printLog = console.log) => {
  instagram.start()

  const firstNItems = isNaN(n) ? items : items.slice(0, n)

  const queue = makeQueue(firstNItems, async (item, index) => {
    const num = `${index+1}/${firstNItems.length}`
    const url = getURL(item)

    if (instagram.isStopped) {
      printLog(`${num}: Skipping <a href="${url}" target="_blank">${url}</a>...`)
      return { status: 'skipped' }
    }

    const amp = 0.9
    const randomTimeout = timeout * (1 + amp * (0.5 - Math.random()))
    const sec = Math.max(0.5, randomTimeout)
    printLog(`Sleeping ${sec.toFixed(2)} seconds`)

    await sleep(sec * 1000)

    if (instagram.isStopped) {
      printLog(`${num}: Skipping <a href="${url}" target="_blank">${url}</a>...`)
      return { status: 'skipped' }
    }

    printLog(`${num}: Fetching <a href="${url}" target="_blank">${url}</a>... `)

    try {
      return await transform(item, index)
    } catch (err) {
      return { status: 'error', error: err.message }
    }
  })

  queue
    .then((res) => printLog(`Finished! Successful: ${res.filter(r => r.status == 'ok').length} items.`))
    .finally(() => instagram.kill())

  return queue
}


const likeItems = async (items, n = 10, printLog = console.log) => {
  instagram.start()

  const firstNItems = items.slice(0, n)

  if (!confirm(`Will put ${n} likes at:\n${firstNItems.map(i => instagramUrl(i)).join("\n")}. OK?`))
    return instagram.kill()

  const queue = makeQueue(firstNItems, async (item, index) => {
    const url = instagramUrl(item)
    const num = `${index+1}/${n}`

    if (instagram.isStopped) {
      printLog(`${num}: Skipping <a href="${url}" target="_blank">${url}</a>...`)
      return
    }

    if (item.has_liked) {
      printLog(`${num}: SKIPPING (Already liked) <a href="${url}" target="_blank">${url}</a>`)
      return
    }

    const sec = 5 + 10 * Math.random()
    printLog(`Sleeping ${sec.toFixed(2)} seconds`)

    await sleep(sec * 1000)

    if (instagram.isStopped) {
      printLog(`${num}: Skipping <a href="${url}" target="_blank">${url}</a>...`)
      return
    }

    printLog(`${num}: Sending like <a href="${url}" target="_blank">${url}</a>... `)

    try {
      const { status } = await instagram.request({
        method: 'like',
        params: [ item.id ],
      })

      printLog(`${status}`, false)
    } catch (err) {
      printLog(`error: ${err.message}`, false)
    }

    console.log('Liked item', num, item, url)
  })

  queue
    .then(() => printLog(`Finished! ${Math.min(n, items.length)} photos.`))
    .finally(() => instagram.kill())

}

const followList = async (users, n = 10, printLog = console.log) => {
  instagram.start()

  const firstNItems = users.slice(0, n)

  if (!confirm(`Will put follow ${n} users:\n${firstNItems.map(i => userUrl(i)).join("\n")}. OK?`))
    return instagram.kill()

  const queue = makeQueue(firstNItems, async (item, index) => {
    const url = userUrl(item)
    const num = `${index+1}/${n}`


    if (instagram.isStopped) {
      printLog(`${num}: Skipping <a href="${url}" target="_blank">${url}</a>...`)
      return
    }

    if (item.has_liked) {
      printLog(`${num}: SKIPPING (Already followed) <a href="${url}" target="_blank">${url}</a>`)
      return
    }

    const sec = 5 + 10 * Math.random()
    printLog(`Sleeping ${sec.toFixed(2)} seconds`)

    await sleep(sec * 1000)

    if (instagram.isStopped) {
      printLog(`${num}: Skipping <a href="${url}" target="_blank">${url}</a>...`)
      return
    }

    printLog(`${num}: Following <a href="${url}" target="_blank">${url}</a>... `)

    try {
      const { status } = await instagram.request({
        method: 'follow',
        params: [ item.pk ],
      })

      printLog(`${status}`, false)
    } catch (err) {
      printLog(`error: ${err.message}`, false)
    }

    console.log('Followed user', num, item, url)
  })

  queue
    .then(() => printLog(`Finished! Followed ${Math.min(n, users.length)} users.`))
    .finally(() => instagram.kill())
}

const makeQueue = (items, step) => {
  return items.reduce(
      (queue, item, index) => queue.then(
        (results) => step(item, index).then(res => [ ...results, res ])
      ),
      Promise.resolve([])
    )
}
