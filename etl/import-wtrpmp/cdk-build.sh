
set -eux

cp -r import_wtrpmp/* /asset-output
pip install -r requirements.txt --target /asset-output
