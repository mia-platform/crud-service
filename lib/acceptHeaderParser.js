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

module.exports = getAccept
