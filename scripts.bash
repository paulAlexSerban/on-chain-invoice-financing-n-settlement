#!/bin/bash
# Invoice Financing Smart Contract Scripts
# Makes sure the folder containing the script will be the root folder
cd "$(dirname "$0")" || exit

# Load environment variables
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -f "$ENV_FILE" ]; then
  echo ".env file not found, creating from template..."
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "Created .env file. Please edit it with your settings."
  else
    echo "Error: .env.example not found!"
    exit 1
  fi
else
  echo "Loading environment variables from $ENV_FILE"
fi

source "$ENV_FILE"

# Verify SUI binary
if [ ! -f "$SUI_BIN" ]; then
    echo "Error: sui binary not found at $SUI_BIN"
    echo "Please update SUI_BIN variable in .env file"
    echo "You can find it with: which sui"
    exit 1
fi

echo "============================================"
echo "On-Chain Invoice Financing Contract Scripts"
echo "============================================"
echo "Using Sui binary: $SUI_BIN"
echo "Network: $SUI_NETWORK"
echo "Package ID: ${PACKAGE_ID:-'Not deployed'}"
echo "============================================"
echo ""

function setup_active_address() {
  local ACTIVE_ADDRESS=$($SUI_BIN client active-address)
  if [ $? -ne 0 ] || [ -z "$ACTIVE_ADDRESS" ]; then
    echo "Error: Unable to retrieve active address from Sui client."
    echo "Create or set an active address using 'sui client new-address' or 'sui client switch --address <address>'."
    exit 1
  fi
  echo "Setting ACTIVE_ADDRESS to $ACTIVE_ADDRESS in .env file"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^ACTIVE_ADDRESS=.*/ACTIVE_ADDRESS=$ACTIVE_ADDRESS/" "$ENV_FILE"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sed -i "s/^ACTIVE_ADDRESS=.*/ACTIVE_ADDRESS=$ACTIVE_ADDRESS/" "$ENV_FILE"
  fi
  echo "ACTIVE_ADDRESS set to $ACTIVE_ADDRESS"
}

function install_app() {
  echo "Installing Next.js app dependencies..."
  yarn --cwd ./dapp
  cd .. || exit
}

function install() {
  echo "Installing dependencies and setting up local configuration..."
  # get Node.js version
  local NODE_VERSION=$(node -v 2>/dev/null)
  if [ $? -ne 0 ] || [[ $NODE_VERSION != v24* ]]; then
    echo "Node.js v18 is required. Please install or switch to the correct version."
    exit 1
  fi

  local SUI_VERSION=$($SUI_BIN --version 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "Sui binary not found or not working. Please check your SUI_BIN path."
    echo "Go to https://docs.sui.io/build/install to install Sui."
    exit 1
  fi
  setup_active_address
  install_app
}

function build_contract() {
  echo "Building the Move contract..."
  $SUI_BIN move build --path ./contract/$MODULE_NAME
  if [ $? -ne 0 ]; then
    echo "Error: Failed to build the Move contract."
    exit 1
  fi
  echo "Contract built successfully."
}

function test_contract() {
  echo "Running tests for the Move contract..."
  $SUI_BIN move test --path ./contract/$MODULE_NAME
  if [ $? -ne 0 ]; then
    echo "Error: Tests failed."
    exit 1
  fi
  echo "All tests passed successfully."
}

function publish_contract() {
  echo "Publishing contract..."
  local OUTPUT=$($SUI_BIN client publish --gas-budget $GAS_BUDGET ./contract/$MODULE_NAME 2>&1)
  echo "$OUTPUT"
  
  local PACKAGE_ID=$(echo "$OUTPUT" | grep -oE 'PackageID: 0x[a-f0-9]+' | awk '{print $2}')
  local UPGRADE_CAP_ID=$(echo "$OUTPUT" | grep -A 20 "UpgradeCap" | grep -oE '│ ObjectID: 0x[a-f0-9]+' | head -1 | awk '{print $3}')
  local FACTORY_OBJECT_ID=$(echo "$OUTPUT" | grep -B 3 "invoice_factory::InvoiceFactory" | grep -oE 'ObjectID: 0x[a-f0-9]+' | head -1 | awk '{print $2}')
  echo "Extracted PACKAGE_ID: $PACKAGE_ID"
  echo "Extracted UPGRADE_CAP_ID: $UPGRADE_CAP_ID"
  echo "Extracted FACTORY_OBJECT_ID: $FACTORY_OBJECT_ID"
  if [ -n "$PACKAGE_ID" ]; then
    echo ""
    echo " [ SUCCESS ] Published package with ID: $PACKAGE_ID"
    echo ""
    echo "Add this to your .env file:"
    echo "PACKAGE_ID=$PACKAGE_ID"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      sed -i "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE"
    fi
  else
    echo " [ ERROR ] Failed to extract Package ID from output"
    exit 1
  fi

  if [ -n "$UPGRADE_CAP_ID" ]; then
    echo " [ SUCCESS ] UpgradeCap object ID: $UPGRADE_CAP_ID"
    # if macos
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/^UPGRADE_CAP_ID=.*/UPGRADE_CAP_ID=$UPGRADE_CAP_ID/" "$ENV_FILE"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      sed -i "s/^UPGRADE_CAP_ID=.*/UPGRADE_CAP_ID=$UPGRADE_CAP_ID/" "$ENV_FILE"
    fi
  fi

  if [ -n "$FACTORY_OBJECT_ID" ]; then
    echo " [ SUCCESS ] Factory Object ID: $FACTORY_OBJECT_ID"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/^FACTORY_OBJECT_ID=.*/FACTORY_OBJECT_ID=$FACTORY_OBJECT_ID/" "$ENV_FILE"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      sed -i "s/^FACTORY_OBJECT_ID=.*/FACTORY_OBJECT_ID=$FACTORY_OBJECT_ID/" "$ENV_FILE"
    fi
    echo ""
    echo "Add this to your dapp/.env.local file:"
    echo "NEXT_PUBLIC_FACTORY_OBJECT_ID=$FACTORY_OBJECT_ID"
    # Update frontend .env.local if it exists
    if [ -f "dapp/.env.local" ]; then
      if grep -q "^NEXT_PUBLIC_FACTORY_OBJECT_ID=" dapp/.env.local; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
          sed -i '' "s|^NEXT_PUBLIC_FACTORY_OBJECT_ID=.*|NEXT_PUBLIC_FACTORY_OBJECT_ID=$FACTORY_OBJECT_ID|" dapp/.env.local
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
          sed -i "s|^NEXT_PUBLIC_FACTORY_OBJECT_ID=.*|NEXT_PUBLIC_FACTORY_OBJECT_ID=$FACTORY_OBJECT_ID|" dapp/.env.local
        fi
      else
        echo "NEXT_PUBLIC_FACTORY_OBJECT_ID=$FACTORY_OBJECT_ID" >> dapp/.env.local
      fi
    fi
  else
    echo " [ WARNING ] Could not extract Factory Object ID from output"
    echo " [ INFO ] You can find it manually with:"
    echo "   sui client objects | grep -A 5 InvoiceFactory"
    echo " Then add it to .env as:"
    echo "   FACTORY_OBJECT_ID=0x..."
  fi
}

# @TODO: the contract upgrade is not working yet - ERROR: "unexpected end of input"
function upgrade_contract() {
  if [ -z "$PACKAGE_ID" ]; then
    echo "Error: PACKAGE_ID not set. Deploy first with: ./scripts.bash publish_contract"
    exit 1
  fi
  
  if [ -z "$UPGRADE_CAP_ID" ]; then
    echo "Error: UPGRADE_CAP_ID not set in .env"
    echo "Find your UpgradeCap object ID with:"
    echo "  sui client objects | grep -i upgradecap"
    exit 1
  fi
  
  echo "Upgrading contract with UpgradeCap $UPGRADE_CAP_ID..."
  
  $SUI_BIN client upgrade --gas-budget ${GAS_BUDGET} \
    --upgrade-capability ${UPGRADE_CAP_ID} \
    "./contract/$MODULE_NAME"
  
  echo "$OUTPUT"
  
  if [ $? -ne 0 ]; then
    echo " [ ERROR ] Contract upgrade failed"
    exit 1
  fi
}

function start_dev_server() {
  echo "Starting Next.js development server..."
  
  # Create or update dapp/.env.local with values from root .env
  echo "Syncing environment variables to dapp/.env.local..."
  
  cat > ./dapp/.env.local << EOF
# Auto-generated from root .env file
# Last updated: $(date)

# Package ID from contract deployment
NEXT_PUBLIC_PACKAGE_ID=$PACKAGE_ID

# Network configuration
NEXT_PUBLIC_NETWORK=$SUI_NETWORK

# Factory Object ID
NEXT_PUBLIC_FACTORY_OBJECT_ID=${FACTORY_OBJECT_ID:-}

# Active address
NEXT_PUBLIC_ACTIVE_ADDRESS=$ACTIVE_ADDRESS
EOF
  
  echo "✅ Environment variables synced to dapp/.env.local"
  
  cd ./dapp || exit
  yarn dev
  cd .. || exit
}

$1