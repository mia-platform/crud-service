'use strict'

module.exports = {
  formatDataForColumnExport: data => {
    if (!data) {
      return ''
    }

    return typeof data === 'object'
      ? JSON.stringify(data)
      : data
  },
}
