#!/usr/bin/env node

// DEBUG
process.on('unhandledRejection', console.error);

// Load dependencies
const dgram   = require('dgram'),
      fs      = require('fs'),
      noop    = () => {},
      packet  = require('native-dns-packet'),
      qs      = require('query-string'),
      rc      = require('rc'),
      sprintf = require('sprintf-js').sprintf,
      util    = require('./util');

// Default configuration
const defaults = {
  port            : process.env.PORT || 53,
  host            : '127.0.0.1',
  debug           : true,
  nameservers     : [],
  recordfile      : './records.txt',
  fallback_timeout: 350,
  reload_config   : false,
};

// Load the config
let config = rc('dnsman', defaults),
    records = [];
loadRecords();

function loadRecords( contents ) {

  const handler = {
    nameserver: ([srv] = []) => { config.nameservers.push({ type: util.records['NS'], srv }); },
    ns        : ([nam, srv] = []) => { records.push({type: util.records['NS'], nam, srv}); },
    a         : ([nam, srv] = []) => { records.push({type: util.records['A'], nam, srv}); },
  };

  contents = contents || fs.readFileSync(config.recordfile,'utf-8');
  if ( contents.indexOf('\nnameserver') >= 0 ) config.nameservers = [];
  records = [];
  contents.split('\n')
    .map( line => line.trim().replace(/\s+/g,' ') )
    .filter( line => line )
    .filter( line => line.substr(0,1) !== '#' )
    .map( line => line.split(' ') )
    .forEach( tokens => {
      let cmd = tokens.shift();
      (handler[cmd]||noop)(tokens);
    });

  records.sort( (a,b) => b.nam.length-a.nam.length);
}

// Logging functions
console.err  = console.error;
let logerror = (...args) => {console.err(sprintf.apply(null, args))},
    loginfo  = (...args) => {if (config.debug) console.log(sprintf.apply(null, args))};

// Config reloading
fs.watchFile(config.recordfile, function (curr, prev) {
  loadRecords();
});
if (config.reload_config) {
  let configFile = config.config;
  fs.watchFile(configFile, function (curr, prev) {
    try {
      config = rc('dnsman', defaults);
    } catch (e) {
      logerror('Could not reload config');
      logerror(e);
    }
  });
}

// Setup the server
const server = dgram.createSocket('udp4');
server.on('listening', () => {
  loginfo('Listening on udp:%s:%d', config.host, config.port);
});
server.on('error', (err) => {
  console.err('Nope nope nope');
  console.err(err);
});
server.on('message', async (message, rinfo) => {
  const query    = packet.parse(message),
        question = query.question[0],
        matches  = util.filterRecords(records,question).concat(config.nameservers);

  (function next() {
    let match = matches.shift();
    if(!match) return;

    switch(util.records[match.type]) {
      case 'NS': // Proxy
        let nParts = match.srv.split(':'),
            ns     = nParts[0],
            port   = nParts[1] || 53,
            fallback,toolate = false;
        (function queryns( msg, ns ) {
          const sock = dgram.createSocket('udp4');
          sock.send(msg,0,msg.length,port,ns,() => {
            fallback = setTimeout(() => {
              toolate = true;
              next();
            },config.fallback_timeout);
          });
          sock.on('error', (err) => {
            logerror('Sock err: %s',err);
          });
          sock.on('message', (resp) => {
            if(toolate) return;
            clearTimeout(fallback);
            server.send(resp,0,resp.length,rinfo.port,rinfo.address);
            sock.close();
          })
        })(message,ns);
        break;
      case 'A': // We know the domain
        match.address = match.address || match.srv;
        let res = util.compileAnswer(query,question,match);
        server.send( res, 0, res.length, rinfo.port, rinfo.address );
        break;
      default:
        next();
        break;
    }
  })();

});

// Actually start listening
server.bind(config.port, config.host);
