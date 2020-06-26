const getSource = require('@architect/shared/sources/_lib/get-source.js')
const stringify = require('csv-stringify')
const utils = require('./_utils.js')

function addMaintainers (rec, sources) {
  // TODO (reports) this won't work if maintainers have the same name.
  const maintainers = sources.map(s => s.maintainers).flat()
  if (maintainers.length)
    rec.maintainers = utils.uniqueByKey(maintainers, 'name')
}

function removeFields (rec, fields) {
  for (const f of fields)
    delete rec[f]
}

/** locations.json source.
 *
 * Pass in params._sourcesPath to override the default sources path. */
async function locations (baseJson, params = {}) {
  return baseJson.map(loc => {
    const rec = Object.assign({}, loc)

    const sources = rec.sources.map(s => getSource({ source: s, ...params }))

    addMaintainers(rec, sources)

    const links = sources.map(s => s.friendly).flat()
    if (links.length)
      rec.links = utils.uniqueByKey(links, 'url')

    removeFields(rec, [ 'timeseries', 'timeseriesSources', 'warnings', 'area', 'created' ])

    return rec
  })
}


/** timeseries-byLocation.json source.
 *
 * Pass in params._sourcesPath to override the default sources path. */
async function timeseriesByLocation (baseJson, params = {}) {
  return baseJson.map(loc => {
    const rec = Object.assign({}, loc)

    const sources = rec.sources.map(s => getSource({ source: s, ...params }))

    addMaintainers(rec, sources)

    removeFields(rec, [ 'area', 'created' ])

    return rec
  })
}


/** timeseries-jhu.csv source.
 *
 */
function timeseriesJhu (baseJson) {
  const allDates = baseJson.reduce((dates, loc) => {
    return dates.concat(Object.keys(loc.timeseries))
  }, [])
  const dates = [ ...new Set(allDates) ].sort()

  const data = baseJson.map(loc => {
    let rec = Object.assign({}, loc)
    rec.lat = rec.coordinates[1]
    rec['long'] = rec.coordinates[0]

    const caseTs = Object.entries(rec.timeseries).
          reduce((hsh, entry) => {
            const dt = entry[0]
            hsh[dt] = entry[1].cases || null
            return hsh
          }, {})
    return Object.assign(rec, caseTs)
  })

  // TODO (reports) Move this to file-writing routine.
  let columns = [
    'locationID',
    'slug',
    'name',
    'level',
    'city',
    'countyName',
    'stateName',
    'countryName',
    'lat',
    'long',
    'population',
    'aggregate',
    'tz'
  ].concat(dates).reduce((hsh, c) => Object.assign(hsh, { [c]: c }), {})
  const overrides = {
    countryName: 'country',
    stateName: 'state',
    countyName: 'county'
  }
  columns = Object.assign(columns, overrides)

  stringify( data, { header: true, columns }).pipe(process.stdout)
}

module.exports = {
  locations,
  timeseriesByLocation,
  timeseriesJhu
}