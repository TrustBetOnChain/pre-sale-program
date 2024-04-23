# Pre sale program

starts a full-featured, single-node cluster on the developer's workstation. Reset the ledger to genesis if it exists. By default the validator will resume an existing ledger.

```
solana-test-validator -r
```

clean the build artifacts and dependencies of an Anchor project. It removes the target directory and the node_modules directory, effectively resetting the project to a clean state.

```
anchor clean
```

runs the test suite of an Anchor project without starting a local Solana validator.

```
anchor test --skip-local-validator
```

# Program Deployment and Upgrade

## Deploying on Devnet

### 1. Set the Solana CLI to use the Devnet cluster:

```
solana config set --url devnet
```

### 2. Request an airdrop of SOL tokens:

```
solana airdrop 5
```

### 3. Initialize a new Anchor project:

```
anchor init <program_name>
```

### 4. Build the program:

```
anchor build
```

### 5. List the program's key pair:

```
anchor keys list
```

Copy the output address and replace the address in the `declare_id!()` macro with it.

### 6. Write your program's contract code.

### 7. Build the program again:

```
anchor build
```

### 8. Deploy the program:

```
anchor deploy
```

## Upgrading on Devnet

### 1. Update the `[provider]` section in the root `Anchor.toml` file:

```
[provider]
cluster = "devnet"
```

### 2. Build the updated program:

```
anchor build
```

### 3. Get the current program information:

```
solana program show --output json <ID>
```

There is `dataLen` field represents current program size you need atleast x2 for upgrade

### 5. Extend the program's account size (if needed):

```
solana program extend <PROGRAM_ID> <MORE_BYTES>
```

### 6. Upgrade the program:

```
anchor upgrade target/deploy/<program_name_file.so> --program-id <ID>
```

Replace `<program_name>`, `<ID>`, `<ADDRESS>`, and `<MORE_BYTES>` with the appropriate values for your program.

### Deployment cost info

https://solana.stackexchange.com/questions/2016/how-can-i-calculate-the-cost-the-deploy-a-progam-to-main-net

```
du -b target/deploy/pre_sale_program.so
```

```
solana rent <BYTES>
```
