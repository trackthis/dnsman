const packet = require('native-dns-packet');
const util   = module.exports;

util.records = Object.assign({},
  packet.consts.NAME_TO_QTYPE,
  packet.consts.QTYPE_TO_NAME
);

util.listAnswer = function (response) {
  let results = [];
  const res   = packet.parse(response);
  res.answer.map(function (r) {
    results.push(r.address || r.data)
  });
  return results.join(', ') || 'nxdomain';
};

util.compileAnswer = function (query, question, answer) {
  let merged = Object.assign({}, query);

  merged.header = Object.assign({}, query.header || {}, {
    qr: answer.qr || 1,
    rd: answer.rd || 1,
    ra: answer.ra || 1,
  });

  let answers = Array.isArray(answer) ? answer : [answer];
  merged.answer = answers.map( entry => {
    switch(entry.type) {
      case 'TXT':
        return {
          'name'   : question.name,
          'type'   : util.records['TXT'],
          'class'  : entry['class'] || 1,
          'ttl'    : entry.ttl || 30,
          'data'   : entry.data || entry.txt || undefined
        };
      default:
        return {
          'name'   : question.name,
          'type'   : 'string' === typeof entry.type ? util.records[entry.type] : entry.type,
          'class'  : entry['class'] || 1,
          'ttl'    : entry.ttl || 30,
          'address': entry.address || entry.srv || question.name
        };
    }
  });

  const buf = Buffer.alloc(4096);
  const wrt = packet.write(buf, merged);
  return buf.slice(0, wrt);
};

util.filterRecords = function (records, question) {
  return records
    .filter(record => ((record.type === 'NS') || ( util.records[record.type] === question.type)))
    .filter(record => question.name.lastIndexOf(record.nam) >= 0)
    .filter(record => question.name.lastIndexOf(record.nam) === (question.name.length - record.nam.length))
    .sort( (left,right) => left.nam.length < right.nam.length ? 1 : ( left.nam.length > right.nam.length ) ? -1 : 0 )
};

util.split = function( str ) {
  return str
    .match(/"([^"]+)"|[^\s]+/g)
    .map( token => token.replace(/""/g,'"') )
    .map( token => ( token.substr(0,1) === '"' ) ? token.substr(1) : token )
    .map( token => ( token.substr(-1) === '"' )  ? token.substr(0,token.length-1) : token );
};
