const scanner = require('sonarqube-scanner');

scanner.customScanner(
  {
    serverUrl: 'http://localhost:9000',
    token: 'sqa_4a78d2176dd34a963af39e616da8c47d3e41fdd8',
    options: {
      'sonar.projectKey': 'iSnapToShop',
      'sonar.sources': './',
      'sonar.exclusions':
        'node_modules/**,frontend/node_modules/**,frontend/public/**,frontend/dev_embed.js,frontend/test/**,bindings/theme/react/iSnapToShop/node_modules/**,bindings/theme/react/iSnapToShop/dist/**, Dockerfile, .gitignore, .vscode/**, jest.config.js, sonar-project.properties, sonar.js',
    },
  },
  () => {
    console.log('SonarQube scan completed.');
  }
);
