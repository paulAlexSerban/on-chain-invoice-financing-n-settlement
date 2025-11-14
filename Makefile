install:
	@echo "Installing dependencies..."
	bash ./scripts.bash install

setup_active_address:
	@echo "Setting up active address in .env..."
	bash ./scripts.bash setup_active_address

build_contract:
	@echo "Building Move contract..."
	bash ./scripts.bash build_contract

test_contract:
	@echo "Running Move contract tests..."
	bash ./scripts.bash test_contract

publish_contract:
	@echo "Publishing Move contract to Sui blockchain..."
	bash ./scripts.bash publish_contract

clean:
	@echo "Cleaning up build artifacts..."
	rm -rf ./contract/invoice_financing/build

upgrade_contract:
	@echo "Upgrading Move contract on Sui blockchain..."
	bash ./scripts.bash upgrade_contract