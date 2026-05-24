FROM node:lts

RUN apt-get update && apt-get install -y \
    git \
    jq \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Copilot CLI, TypeScript runtime, and zx (required by entrypoint.ts)
RUN npm install -g @github/copilot tsx zx

ARG CACHE_BUST=1
RUN echo "cache bust: $CACHE_BUST" > /dev/null
COPY container/bootstrap.sh /app/bootstrap.sh
RUN chmod +x /app/bootstrap.sh

ENTRYPOINT ["/app/bootstrap.sh"]
