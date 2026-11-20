'use strict'

const acceptHeaderRegex = /(?<content>(?<type>.+?)\/(?<sub>.+?)(?:\+(?<suffix>.+?))?)(?:;.*?(?:\s*q=(?<weight>[.\d]+))?.*?)?(?:,|$)/g

function getAccept(acceptHeader) {
  const accepts = []

  const matches = acceptHeader.matchAll(acceptHeaderRegex)

  for (const match of matches) {
    const { content, weight } = match.groups

    accepts.push({ content, weight: weight ?? 1.0 })
  }

  // take the first with the highest quality param ensuring that not whitespaces are captured
  return accepts.sort(sortAcceptsByQualityReversed)?.[0]?.content.trim()
}

function sortAcceptsByQualityReversed(typeA, typeB) {
  if (typeA.weight < typeB.weight) {
    return 1
  }

  if (typeA.weight > typeB.weight) {
    return -1
  }

  return 0
}

/**
 * Returns the reply type callback used by fastify
 * @param {string} defaultAccept default type that will be used as reply type if wildcard
 * is found in the input accept header
 * @returns {(acceptHeader: string) => string} replyType callback
 */
function getReplyTypeCallback(defaultAccept) {
  return (acceptHeader = '') => {
    const accept = getAccept(acceptHeader)

    if (!accept || accept === '*/*') { return defaultAccept }

    return accept
  }
}

module.exports = {
  getAccept,
  getReplyTypeCallback,
}
