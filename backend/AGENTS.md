This is a coding challenge using NestJS, which I am learning.

When implementing NestJS-specific code:
- prefer standard NestJS patterns over custom abstractions
- keep the architecture minimal
- don't add infrastructure unless required
- work in small vertical slices
- explain newly introduced NestJS concepts briefly
- don't modify unrelated functionality

Core auction business logic should preferably live in small,
framework-independent TypeScript functions.

After each substantial implementation:
- run relevant tests
- run the application when useful
- smoke-test the endpoint manually
- summarize what changed and any NestJS concepts introduced
