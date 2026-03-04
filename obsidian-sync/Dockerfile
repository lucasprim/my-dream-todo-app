FROM node:22-alpine

RUN npm install -g obsidian-headless

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir -p /vault /home/nextjs/.config/obsidian-headless \
 && chown -R nextjs:nodejs /vault /home/nextjs

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /vault

USER nextjs

ENTRYPOINT ["/entrypoint.sh"]
