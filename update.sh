#!/usr/bin/env bash

# Save for later
OWD=$(realpath $(dirname $0));

echo "Updating .gitignore"
curl -s https://www.gitignore.io/api/osx,linux,windows,node > .gitignore
echo ".idea/" >> .gitignore
#echo "/data/" >> .gitignore
echo ".gtm/" >> .gitignore

#echo "Updating modules"
#git submodule foreach --recursive git clean -xfd &>/dev/null
#git submodule update --init --recursive
#curl -sL https://unpkg.com/picnic > frontend/docroot/assets/picnicss/picnic.min.css

#echo "Building dependencies"
#node_modules/.bin/browserify -e frontend/assets/deepmerge.js   -o frontend/docroot/assets/deepmerge.js
#node_modules/.bin/browserify -e frontend/assets/querystring.js -o frontend/docroot/assets/querystring.js

#echo "Building client"
#node_modules/.bin/browserify -e client/src/client.js          -o client/dist/client.standalone.js
#node_modules/.bin/browserify -e client/src/transport-https.js -o client/dist/transport.https.js
