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
