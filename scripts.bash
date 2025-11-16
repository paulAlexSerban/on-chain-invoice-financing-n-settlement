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
  $SUI_BIN move build --path ./contract/$CONTRACT_DIR
  if [ $? -ne 0 ]; then
    echo "Error: Failed to build the Move contract."
    exit 1
  fi
  echo "Contract built successfully."
}

function test_contract() {
  echo "Running tests for the Move contract..."
  $SUI_BIN move test --path ./contract/$CONTRACT_DIR
  if [ $? -ne 0 ]; then
    echo "Error: Tests failed."
    exit 1
  fi
  echo "All tests passed successfully."
}

function publish_contract() {
  echo "Publishing contract..."
  local OUTPUT=$($SUI_BIN client publish --gas-budget $GAS_BUDGET ./contract/$CONTRACT_DIR 2>&1)
  mkdir -p publish_logs
  echo "$OUTPUT" >> publish_logs/publish_output-$(date +%Y%m%d%H%M%S).log
  
  local PACKAGE_ID=$(echo "$OUTPUT" | grep -oE 'PackageID: 0x[a-f0-9]+' | awk '{print $2}')

  echo "Extracted PACKAGE_ID: $PACKAGE_ID"
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
}

function start_dev_server() {
  echo "Starting Next.js development server..."
  
  # Create or update dapp/.env with values from root .env
  echo "Syncing environment variables to dapp/.env..."
  
  cat > ./dapp/.env << EOF
# Auto-generated from root .env file
# Last updated: $(date)

# Package ID from contract deployment
NEXT_PUBLIC_CONTRACT_ID=${PACKAGE_ID:-}
NEXT_PUBLIC_OWNER_ADDRESS=${ACTIVE_ADDRESS:-}
NEXT_PUBLIC_FACTORY_OBJECT_ID=${INVOICE_FACTORY_ID:-}
NEXT_PUBLIC_TREASURY_ID=${TREASURY_ID:-}

# Network configuration
NEXT_PUBLIC_NETWORK=${SUI_NETWORK:-}

EOF
  
  echo "Environment variables synced to dapp/.env"
  
  cd ./dapp || exit
  yarn dev
  cd .. || exit
}

$1