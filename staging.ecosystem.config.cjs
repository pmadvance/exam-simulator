module.exports = {
  apps: [
    {
      name: "pm-api-staging",
      cwd: "./apps/api",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "256M",
      error_file: "./logs/api-staging-error.log",
      out_file: "./logs/api-staging-out.log",
      merge_logs: true,
      time: true
    },
    {
      name: "pm-web-staging",
      cwd: "./apps/web",
      script: "npm",
      args: "run start -- -p 3001",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "256M",
      error_file: "./logs/web-staging-error.log",
      out_file: "./logs/web-staging-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
