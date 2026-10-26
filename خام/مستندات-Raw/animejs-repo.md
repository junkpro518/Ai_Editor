---
fetched: 2026-08-04
platform: github
url: https://github.com/juliangarnier/anime
author: juliangarnier (Julian Garnier)
posted: 2025
kind: repo
media: []
---

# مصدر خام: مستودع anime.js

> نصّ `README.md` كاملاً + الرخصة + `package.json` كما وردت في المستودع (بلا اختزال).
> **مصدرٌ ثانٍ لصفحة موجودة (B0002)** — يُدمج **اتحاداً لا استبدالاً**.

---

## README.md (النص الكامل)

# Anime.js

<p align="center">
  <picture align="center">
    <source media="(prefers-color-scheme: dark)" srcset="./assets/images/animejs-v4-logo-animation-dark.gif">
    <img align="center" alt="Anime.js V4 logo animation" src="./assets/images/animejs-v4-logo-animation.gif" width="560">
  </picture>
</p>

<p align="center">
  <strong>
  <em>Anime.js</em> is a fast, multipurpose and lightweight JavaScript animation library with a simple, yet powerful API.<br>
  It works with CSS properties, SVG, DOM attributes and JavaScript Objects.
  </strong>
</p>


<p align="center">
  <img alt="NPM Downloads" src="https://img.shields.io/npm/dm/animejs?style=flat-square&logo=npm">
  <img alt="jsDelivr hits (npm)" src="https://img.shields.io/jsdelivr/npm/hm/animejs?style=flat-square&logo=jsdeliver">
  <img alt="GitHub Sponsors" src="https://img.shields.io/github/sponsors/juliangarnier?style=flat-square&logo=github">
</p>

## Sponsors

Anime.js is 100% free and is only made possible with the help of our sponsors.
Help the project become sustainable by sponsoring us on <a target="_blank" href="https://github.com/sponsors/juliangarnier">GitHub Sponsors</a>.

### Platinum sponsors

<table>
  <tbody>
    <tr>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-large.png?v=200126" width="310">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-large.png?v=200126" width="310">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-large.png?v=200126" width="310">
          </picture>
        </a>
      </td>
    </tr>
  </tbody>
</table>

### Silver sponsors

<table>
  <tbody>
    <tr>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-small.png?v=200126" width="141">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-small.png?v=200126" width="141">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-small.png?v=200126" width="141">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-small.png?v=200126" width="141">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-small.png?v=200126" width="141">
          </picture>
        </a>
      </td>
      <td>
        <a target="_blank" href="https://github.com/sponsors/juliangarnier">
          <picture>
            <img align="center" src="./assets/sponsors/placeholder-small.png?v=200126" width="141">
          </picture>
        </a>
      </td>
    </tr>
  </tbody>
</table>

Get featured here by becoming a <a target="_blank" href="https://github.com/sponsors/juliangarnier">GitHub Sponsor</a>.


## Usage

Anime.js V4 works by importing ES modules like so:


<table>
<tr>
  <td>

```javascript
import {
  animate,
  stagger,
} from 'animejs';

animate('.square', {
  x: 320,
  rotate: { from: -180 },
  duration: 1250,
  delay: stagger(65, { from: 'center' }),
  ease: 'inOutQuint',
  loop: true,
  alternate: true
});
```

  </td>
  <td>
    <img align="center" alt="Anime.js code example" src="./assets/images/usage-example-result.gif">
  </td>
</tr>
</table>

## V4 Documentation

The full documentation is available [here](https://animejs.com/documentation).

## V3 Migration guide

You can find the v3 to v4 migration guide [here](https://github.com/juliangarnier/anime/wiki/Migrating-from-v3-to-v4).

## NPM development scripts

First, run `npm i` to install all the necessary packages.
Then, execute the following scripts with `npm run <script>`.

| script | action |
| ------ | ------ |
| `dev` | Watches for changes in `src/**/*.js`, bundles the ESM version to `lib/` and creates type declarations in `types/` |
| `dev:test` | Runs `dev` and `test:browser` concurrently |
| `build` | Bundles ESM / UMD / CJS / IIFE versions to `lib/` and creates type declarations in `types/` |
| `test:browser` | Starts a local server and runs all browser-related tests |
| `test:node` | Starts Node-related tests |
| `open:examples` | Starts a local server to browse the examples locally |

© [Julian Garnier](http://juliangarnier.com) | [MIT License](LICENSE.md)

---

## LICENSE.md (النص الكامل)

The MIT License

Copyright (c) 2025 Julian Garnier

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## package.json
```json
{
  "name": "animejs",
  "version": "4.5.0",
  "description": "JavaScript animation engine",
  "homepage": "https://animejs.com",
  "author": "Julian Garnier <julian@animejs.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/juliangarnier/anime.git"
  },
  "bugs": {
    "url": "https://github.com/juliangarnier/anime/issues"
  },
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/juliangarnier"
  },
  "keywords": [
    "anime",
    "animejs",
    "anime.js",
    "timer",
    "animation",
    "timeline",
    "animatable",
    "draggable",
    "scope",
    "engine",
    "scroll",
    "easings",
    "cubic-bezier",
    "spring",
    "splitText",
    "CSS",
    "SVG",
    "WAAPI",
    "Canvas",
    "WebGL",
    "treejs",
    "tree.js"
  ],
  "files": [
    "dist"
  ],
  "sideEffects": [
    "./dist/modules/adapters/**",
    "./src/adapters/**"
  ],
  "type": "module",
  "main": "./dist/modules/index.cjs",
  "module": "./dist/modules/index.js",
  "types": "./dist/modules/index.d.ts",
  "jsdelivr": "./dist/bundles/anime.umd.min.js",
  "unpkg": "./dist/bundles/anime.umd.min.js",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "types": "./dist/modules/index.d.ts",
      "require": "./dist/modules/index.cjs",
      "import": "./dist/modules/index.js",
      "default": "./dist/modules/index.cjs"
    },
    "./timer": {
      "types": "./dist/modules/timer/index.d.ts",
      "require": "./dist/modules/timer/index.cjs",
      "import": "./dist/modules/timer/index.js",
      "default": "./dist/modules/timer/index.cjs"
    },
    "./animation": {
      "types": "./dist/modules/animation/index.d.ts",
      "require": "./dist/modules/animation/index.cjs",
      "import": "./dist/modules/animation/index.js",
      "default": "./dist/modules/animation/index.cjs"
    },
    "./timeline": {
      "types": "./dist/modules/timeline/index.d.ts",
      "require": "./dist/modules/timeline/index.cjs",
      "import": "./dist/modules/timeline/index.js",
      "default": "./dist/modules/timeline/index.cjs"
    },
    "./animatable": {
      "types": "./dist/modules/animatable/index.d.ts",
      "require": "./dist/modules/animatable/index.cjs",
      "import": "./dist/modules/animatable/index.js",
      "default": "./dist/modules/animatable/index.cjs"
    },
    "./draggable": {
      "types": "./dist/modules/draggable/index.d.ts",
      "require": "./dist/modules/draggable/index.cjs",
      "import": "./dist/modules/draggable/index.js",
      "default": "./dist/modules/draggable/index.cjs"
    },
    "./scope": {
      "types": "./dist/modules/scope/index.d.ts",
      "require": "./dist/modules/scope/index.cjs",
      "import": "./dist/modules/scope/index.js",
      "default": "./dist/modules/scope/index.cjs"
    },
    "./engine": {
      "types": "./dist/modules/engine/index.d.ts",
      "require": "./dist/modules/engine/index.cjs",
      "import": "./dist/modules/engine/index.js",
      "default": "./dist/modules/engine/index.cjs"
    },
    "./events": {
      "types": "./dist/modules/events/index.d.ts",
      "require": "./dist/modules/events/index.cjs",
      "import": "./dist/modules/events/index.js",
      "default": "./dist/modules/events/index.cjs"
    },
    "./layout": {
      "types": "./dist/modules/layout/index.d.ts",
      "require": "./dist/modules/layout/index.cjs",
      "import": "./dist/modules/layout/index.js",
      "default": "./dist/modules/layout/index.cjs"
    },
    "./easings": {
      "types": "./dist/modules/easings/index.d.ts",
      "require": "./dist/modules/easings/index.cjs",
      "import": "./dist/modules/easings/index.js",
      "default": "./dist/modules/easings/index.cjs"
    },
    "./easings/eases": {
      "types": "./dist/modules/easings/eases/index.d.ts",
      "require": "./dist/modules/easings/eases/index.cjs",
      "import": "./dist/modules/easings/eases/index.js",
      "default": "./dist/modules/easings/eases/index.cjs"
    },
    "./easings/linear": {
      "types": "./dist/modules/easings/linear/index.d.ts",
      "require": "./dist/modules/easings/linear/index.cjs",
      "import": "./dist/modules/easings/linear/index.js",
      "default": "./dist/modules/easings/linear/index.cjs"
    },
    "./easings/steps": {
      "types": "./dist/modules/easings/steps/index.d.ts",
      "require": "./dist/modules/easings/steps/index.cjs",
      "import": "./dist/modules/easings/steps/index.js",
      "default": "./dist/modules/easings/steps/index.cjs"
    },
    "./easings/irregular": {
      "types": "./dist/modules/easings/irregular/index.d.ts",
      "require": "./dist/modules/easings/irregular/index.cjs",
      "import": "./dist/modules/easings/irregular/index.js",
      "default": "./dist/modules/easings/irregular/index.cjs"
    },
    "./easings/cubic-bezier": {
      "types": "./dist/modules/easings/cubic-bezier/index.d.ts",
      "require": "./dist/modules/easings/cubic-bezier/index.cjs",
      "import": "./dist/modules/easings/cubic-bezier/index.js",
      "default": "./dist/modules/easings/cubic-bezier/index.cjs"
    },
    "./easings/spring": {
      "types": "./dist/modules/easings/spring/index.d.ts",
      "require": "./dist/modules/easings/spring/index.cjs",
      "import": "./dist/modules/easings/spring/index.js",
      "default": "./dist/modules/easings/spring/index.cjs"
    },
    "./utils": {
      "types": "./dist/modules/utils/index.d.ts",
      "require": "./dist/modules/utils/index.cjs",
      "import": "./dist/modules/utils/index.js",
      "default": "./dist/modules/utils/index.cjs"
    },
    "./svg": {
      "types": "./dist/modules/svg/index.d.ts",
      "require": "./dist/modules/svg/index.cjs",
      "import": "./dist/modules/svg/index.js",
      "default": "./dist/modules/svg/index.cjs"
    },
    "./text": {
      "types": "./dist/modules/text/index.d.ts",
      "require": "./dist/modules/text/index.cjs",
      "import": "./dist/modules/text/index.js",
      "default": "./dist/modules/text/index.cjs"
    },
    "./waapi": {
      "types": "./dist/modules/waapi/index.d.ts",
      "require": "./dist/modules/waapi/index.cjs",
      "import": "./dist/modules/waapi/index.js",
      "default": "./dist/modules/waapi/index.cjs"
    },
    "./adapters": {
      "types": "./dist/modules/adapters/index.d.ts",
      "require": "./dist/modules/adapters/index.cjs",
      "import": "./dist/modules/adapters/index.js",
      "default": "./dist/modules/adapters/index.cjs"
    },
    "./adapters/three": {
      "types": "./dist/modules/adapters/three/index.d.ts",
      "require": "./dist/modules/adapters/three/index.cjs",
      "import": "./dist/modules/adapters/three/index.js",
      "default": "./dist/modules/adapters/three/index.cjs"
    }
  },
  "peerDependencies": {
    "three": ">=0.150.0",
    "@types/three": ">=0.150.0"
  },
  "peerDependenciesMeta": {
    "three": {
      "optional": true
    },
    "@types/three": {
      "optional": true
    }
  },
  "devDependencies": {
    "@rollup/plugin-terser": "^0.4.4",
    "@types/mocha": "^10.0.10",
    "@types/node": "^24.3.0",
    "browser-sync": "^3.0.4",
    "chai": "^4.3.10",
    "mocha": "^10.2.0",
    "nodemon": "^3.1.10",
    "rollup": "^4.9.1",
    "three": "^0.184.0",
    "@types/three": "^0.184.0",
    "tweaks": "^0.3.4",
    "typescript": "^5.9.2"
  },
  "scripts": {
    "dev": "nodemon --quiet --watch src --ext js --exec \"rollup -c && tsc -p tsconfig.types.json && echo '\\n\\033[32m✓ modules and types compiled\\n\\033[36m⊙ watching for changes...\\n\\033[0m'\"",
    "dev:test": "npm run dev & npm run test:browser",
    "build": "rm -rf dist && build=true rollup -c && tsc -p tsconfig.types.json && echo '\\n\\033[32m✓ build completed\\n\\033[0m'",
    "test:browser": "browser-sync start --startPath tests/index.html --server --files 'dist/modules/**/*.js' 'tests/suites/**/*.js' --no-notify --directory",
    "test:node": "node --allow-natives-syntax \"node_modules/.bin/mocha\" -u tdd --timeout 20000 \"./tests/suites/node.test.js\"",
    "open:examples": "browser-sync start --startPath examples --server --no-notify --directory --files '**/*.js'",
    "typecheck": "tsc -p . && tsc -p tests && tsc -p examples",
    "typecheck:examples": "tsc -p examples",
    "typecheck:tests": "tsc -p tests"
  }
}
```

## بيانات إضافية

- المجلدات: assets/ dist/ examples/ src/ tests/ 
- حجم dist: 2.6M
- ملفات dist: bundles modules 
