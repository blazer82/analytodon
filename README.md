# Analytodon - Analytics for Mastodon

[![build-badge]](https://github.com/blazer82/analytodon/actions?workflow=build)

This is the official repository for the service [www.analytodon.com](https://www.analytodon.com).

Contributions are welcome.

Self-hosting is explicitely allowed.

There's a companion repository [analytodon-cli](https://github.com/blazer82/analytodon-cli) that is required to properly run the service.

## Development

This application is based on [Next.js](https://nextjs.org).

### Getting Started

1. Provide an empty MongoDB database.

2. Edit the config file `next.config.js` or provide the necessary environment variables.

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

[build-badge]: https://github.com/blazer82/analytodon/workflows/build/badge.svg
