# Change log

## 0.18.9

### Patch Changes

- [#1843](https://github.com/graphql-hive/SOFA/pull/1843) [`dbf4aaa`](https://github.com/graphql-hive/SOFA/commit/dbf4aaaa0efe0564d433129aa4a00b522b663837) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`@graphql-tools/utils@^11.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.0.0) (from `^10.0.0`, in `dependencies`)

## 0.18.8

### Patch Changes

- [#1459](https://github.com/Urigo/SOFA/pull/1459) [`5442709`](https://github.com/Urigo/SOFA/commit/54427094ea98dde6994e14b15f38d2408c04b46f) Thanks [@ernestognw](https://github.com/ernestognw)! - Export `createSofa` and `createSofaRouter` for custom intermediate configuration

- [#1596](https://github.com/Urigo/SOFA/pull/1596) [`390ecd2`](https://github.com/Urigo/SOFA/commit/390ecd21202948935a58df191b7c3095a23e3899) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`@whatwg-node/fetch@^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.0) (from `^0.9.14`, in `dependencies`)

## 0.18.5

### Patch Changes

- [#1468](https://github.com/Urigo/SOFA/pull/1468) [`a7144f9`](https://github.com/Urigo/SOFA/commit/a7144f9e689599729dbcf762bbe6164283e41152) Thanks [@renovate](https://github.com/apps/renovate)! - Fix TypeScript issues

## 0.18.4

### Patch Changes

- [#1439](https://github.com/Urigo/SOFA/pull/1439) [`428522d`](https://github.com/Urigo/SOFA/commit/428522d490f8d057904e1e4fd27ba51d5fd8e479) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`fets@^0.8.0` ↗︎](https://www.npmjs.com/package/fets/v/0.8.0) (from `^0.7.0`, in `dependencies`)

## 0.18.3

### Patch Changes

- [`5c3528e`](https://github.com/Urigo/SOFA/commit/5c3528eec41c35e1b6a09fd54751fc69f744f7a2) Thanks [@ardatan](https://github.com/ardatan)! - Resolve enums correctly

## 0.18.2

### Patch Changes

- [#1413](https://github.com/Urigo/SOFA/pull/1413) [`ef9ffb6`](https://github.com/Urigo/SOFA/commit/ef9ffb658da7301e31cbec2c4865be78ce04c085) Thanks [@mhayes](https://github.com/mhayes)! - Fix release

- [#1410](https://github.com/Urigo/SOFA/pull/1410) [`4999686`](https://github.com/Urigo/SOFA/commit/49996861148d96657f707f565e32a0f87d3abd21) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`fets@^0.7.0` ↗︎](https://www.npmjs.com/package/fets/v/0.7.0) (from `^0.6.4`, in `dependencies`)

## 0.18.1

### Patch Changes

- [#1372](https://github.com/Urigo/SOFA/pull/1372) [`dac1f7e`](https://github.com/Urigo/SOFA/commit/dac1f7eb93ecc251d068d19f5e150e888e64741d) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Bug fix: Generate spec for Union types

- [#1388](https://github.com/Urigo/SOFA/pull/1388) [`ffe6e67`](https://github.com/Urigo/SOFA/commit/ffe6e67894f40619d2ae8c99e16d23301a27756a) Thanks [@robertherber](https://github.com/robertherber)! - fix: add types to exports in package.json

- [#1390](https://github.com/Urigo/SOFA/pull/1390) [`03b0ccf`](https://github.com/Urigo/SOFA/commit/03b0ccf585aaacb0aec87022151e1c126c9f225c) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency [`@whatwg-node/fetch@^0.9.14` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.14) (from `^0.9.0`, in `dependencies`)
  - Updated dependency [`fets@^0.6.4` ↗︎](https://www.npmjs.com/package/fets/v/0.6.4) (from `^0.2.0`, in `dependencies`)

- [#1370](https://github.com/Urigo/SOFA/pull/1370) [`028af74`](https://github.com/Urigo/SOFA/commit/028af7484889f64cd89e50b43186d15c968b4972) Thanks [@nathanchapman](https://github.com/nathanchapman)! - Handle nested query parameters

## 0.18.0

### Minor Changes

- [`f6afa0e`](https://github.com/Urigo/SOFA/commit/f6afa0ef9866852dda2938c3c477a42df6764e81) Thanks [@ardatan](https://github.com/ardatan)! - Breaking changes:
  - Drop Node 14 support and require Node >16

  - OpenAPI options are now under `openAPI`

  - SwaggerUI options are now under `swaggerUI`

## 0.17.1

### Patch Changes

- [`61e0494`](https://github.com/Urigo/SOFA/commit/61e0494f85caf5adf498d132092d213d500457b0) Thanks [@ardatan](https://github.com/ardatan)! - Add missing options for OAS

## 0.17.0

### Minor Changes

- [`a32e2d6`](https://github.com/Urigo/SOFA/commit/a32e2d635c43468b5c70cbdc73143ead10bf5bc3) Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: Now OpenAPI module has been deprecated, SOFA now automatically generates \`openapi.json\` and Swagger UI on \`/docs\` on the fly

### vNEXT

### v0.12.0

- Allow to override mapping of custom scalar to OpenAPI (#1159) - Thanks @izumin5210
- Stop using AST Node to retrieve Enum values in OpenAPI (#1158) - Thanks @izumin5210
- Feature/openapi tags description (#1114) - Thanks @NorbertRuff
- Fix payload parsing for subscriptions (#1148) - Thanks @csuriano23

## BREAKING CHANGES

- `createSofaRouter` is no longer exported, use `useSofa` directly
- `useSofa` now supports more server frameworks. It uses `itty-router` and `@whatwg-node/server` so it supports almost all JS environments;
  [See more](https://github.com/ardatan/whatwg-node/tree/master/packages/server#integrations)
  Documentation on SOFA's docs will be updated soon.
- `OpenAPI` no longer has `.save` method. Use `.openapiDocument` to get the schema;

```diff
- openApi.save('swagger.json');
+ fs.writeFileSync('swagger.json', JSON.stringify(sofa.openapiDocument, null, 2));
```

### v0.10.2

In this release express is removed as dependency. New `basePath` option is required to resolve sofa routes properly

```js
app.use(
  '/api',
  useSofa({
    basePath: '/api',
    schema,
  })
);
```

Added new server framework agnostic api

```js
const invokeSofa = createSofaRouter({
  basePath: '/api',
  schema,
});
...
const response = await invokeSofa({
  method: req.method,
  url: req.url,
  body: JSON.parse(await getStream(req)),
  contextValue: {
    req
  },
});
```

### v0.8.2

- Replace winston with custom logger ([#534](https://github.com/Urigo/SOFA/pull/534)) - Thanks @TrySound !

### v0.8.1

- Bump @graphql-tools/utils to fix [ardatan/graphql-tools#1928](https://github.com/ardatan/graphql-tools/pull/1928)

### v0.8.0

- Update dependencies

### v0.7.0

- feat(swagger): custom components and security for OpenAPI [PR #296](https://github.com/Urigo/SOFA/pull/296)

### v0.6.1

- fix(swagger): broken type of ID scalar in generated swagger document [PR #280](https://github.com/Urigo/SOFA/pull/280)
- fix: do not resolve nil variables [PR #193](https://github.com/Urigo/SOFA/pull/193)
- fix: use Kind from graphql instead of strings [PR #192](https://github.com/Urigo/SOFA/pull/192)
- fix: replace request package with Axios [PR #194](https://github.com/Urigo/SOFA/pull/194)

### v0.6.0

- fix(swagger): fix descriptions [PR #178](https://github.com/Urigo/SOFA/pull/178)
- feat: support GraphQL Interfaces [PR #167](https://github.com/Urigo/SOFA/pull/167)

### v0.5.1

- fix: do not skip falsy values (only null and undefined) [PR #134](https://github.com/Urigo/SOFA/pull/134)

### v0.5.0

- feat(swagger): add description [PR #107](https://github.com/Urigo/SOFA/pull/107)
- feat(swagger): add `ID` scalar definition [PR #107](https://github.com/Urigo/SOFA/pull/107)
- fix(swagger): use `requestBody` or `parameters` not both [PR #107](https://github.com/Urigo/SOFA/pull/107)
- fix(swagger): generate valid YAML structure for nested objects [PR #107](https://github.com/Urigo/SOFA/pull/107)
- fix(swagger): avoid empty `required` array [PR #107](https://github.com/Urigo/SOFA/pull/107)

### v0.4.0

- feat: add error handler [PR #44](https://github.com/Urigo/SOFA/pull/44) [PR #45](https://github.com/Urigo/SOFA/pull/45)
- feat: allow to customize endpoint's HTTP Method [PR #46](https://github.com/Urigo/SOFA/pull/46)
- feat: add InputTypeObjects to OpenAPI generation [PR #34](https://github.com/Urigo/SOFA/pull/34) - [@hajnalben](https://github.com/hajnalben)

### v0.3.0

- fix: parse InputTypeObject with JSON.parse [PR #30](https://github.com/Urigo/SOFA/pull/30)
- feat: custom `depthLimit` (circular references) [PR #29](https://github.com/Urigo/SOFA/pull/29)

### v0.2.3

- fix: prevent circular references [PR #23](https://github.com/Urigo/SOFA/pull/23)

### v0.2.2

We didn't track changes before this version.
