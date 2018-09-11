const packet = require('native-dns-packet');
const util   = module.exports;

util.records = {
  '1' : 'A',
  '2' : 'NS',
  '5' : 'CNAME',
  '6' : 'SOA',
  '12': 'PTR',
  '15': 'MX',
  '16': 'TXT',
  '28': 'AAAA'
};

Object.keys(util.records).forEach(num => {
  util.records[util.records[num]] = parseInt(num);
});

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

  merged.answer = [
    {
      'name'   : question.name,
      'type'   : 'string' === typeof answer.type ? util.records[answer.type] : answer.type,
      'class'  : answer['class'] || 1,
      'ttl'    : answer.ttl || 30,
      'address': answer.address || question.name
    },
  ];

  const buf = Buffer.alloc(4096);
  const wrt = packet.write(buf, merged);
  return buf.slice(0, wrt);
};

util.filterRecords = function (records, question) {
  return records
    .filter(record => ((record.type === util.records['NS']) || (record.type === question.type)))
    .filter(record => question.name.lastIndexOf(record.nam) >= 0)
    .filter(record => question.name.lastIndexOf(record.nam) === (question.name.length - record.nam.length))
};

// module.exports.randomElement = function( arr ) {
//   if(!Array.isArray(arr)) return undefined;
//   return arr[ Math.floor( Math.random() * arr.length )];
// };
