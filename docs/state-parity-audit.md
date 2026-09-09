# State parity audit — baseline before changes

Evidence inspected: current `docs/images/workbench-preview.png`, previous `docs/theme-studio.md` walkthrough, the native export implementation (`generateTheme`), contributed theme JSON, Webview controls/state, configuration getters/Save, bridge and CSS generator. A separate user-exported `theme.json` or newly attached screenshot was not present in the workspace at audit time; its path has been requested. These observations concern the checked-in implementation, not an unseen attachment.

Every existing visible control uses `state`; serialization whitelists `Object.keys(defaultConfig)`. Save normalizes then writes a manually maintained list of individual settings. Reopening reconstructs state through another getter/default list. The bridge carries CSS only, without a configuration identity or round-trip payload. Native export contains `colors`, `tokenColors` and semantic syntax fields, but none of the visual configuration below.

| Control / canonical field | Serialized / persisted before change | Runtime binding / target before change | Baseline classification |
| --- | --- | --- | --- |
| Base / `baseColor` | yes / yes | palette, backdrop base and region tints | WORKS END-TO-END in prior default QA |
| Accent / `accentColor` | yes / yes | palette, active icon/tab | WORKS END-TO-END in prior default QA |
| Gradient enabled / `gradientEnabled` | yes / yes | global pseudo-element image | WORKS END-TO-END in prior default QA |
| Mode / `gradientMode` | yes / yes | UI generates auto stops; runtime consumes supplied stops | PREVIEW ONLY regeneration; preset buttons do not regenerate auto stops |
| Stops / `gradientStops` | yes / yes | global background stop array | WORKS END-TO-END for default; non-default reload not tested |
| Stop color | yes / yes | generated linear field + atmospheric colors | WORKS END-TO-END; UI mutates before history snapshot |
| Stop position / reorder | yes / yes | sorted CSS percentages | WORKS END-TO-END; no explicit reorder buttons |
| Stop opacity | yes / yes | generated stop alpha | WORKS END-TO-END; UI mutates before history snapshot |
| Stop softness | yes / yes | binary midpoint threshold | RENDERED WITH HARDCODED VALUE above threshold |
| Global softness / `gradientSoftness` | yes / yes | same threshold, plus local light falloff | RENDERED WITH HARDCODED VALUE across much of range |
| Direction / `gradientAngle` | yes / yes | global linear angle | WORKS END-TO-END; diagnostic rotation not yet tested |
| Strength / `gradientStrength` | yes / yes | stop and atmosphere alpha | WORKS END-TO-END; non-default reload not tested |
| Softlight enabled / `softlightEnabled` | yes / yes | editor radial image; additionally gated by gradient enabled | PERSISTED BUT NOT RENDERED independently |
| Softlight mode / `softlightMode` | yes / yes | Auto/Accent/Custom radial color | WORKS END-TO-END; extremes not verified |
| Softlight custom / `softlightColor` | yes / yes | radial color | WORKS END-TO-END; extremes not verified |
| Softlight strength / `editorSoftlight` | yes / yes | radial alpha | WORKS END-TO-END; extremes not verified |
| Softlight spread / `softlightSpread` | yes / yes | radial ellipse dimensions | WORKS END-TO-END; extremes not verified |
| Softlight softness / `softlightSoftness` | yes / yes | radial falloff percentages | WORKS END-TO-END; extremes not verified |
| Glass enabled / `glassEnabled` | yes / yes | six region backdrop filters | PERSISTED BUT NOT RENDERED on floating UI |
| Gaussian blur / `glassBlur` | yes / yes | region blur pixels | PERSISTED BUT NOT RENDERED on popups |
| Glass opacity / `glassOpacity` | yes / yes, but host clamps to 0.5 | region alpha only | PREVIEW ONLY below 0.5; opaque widgets mask glass |
| Saturation / `glassSaturation` | yes / yes | region filter only | PERSISTED BUT NOT RENDERED on popups |
| Rounded enabled / `roundedCorners` | yes / yes | toggles Modern UI; radius only on structural parts | PERSISTED BUT NOT RENDERED on floating/interactive surfaces |
| Radius / `borderRadius` | in state / yes; no Studio input | structural radius; tabs forced to zero | NOT SERIALIZED from a control; partial render only |
| Neon enabled / `neonEnabled` | yes / yes | icon/tab filter | PERSISTED BUT NOT RENDERED on panel/focused controls |
| Neon color mode/custom / `neonColorMode`, `neonCustomColor` | yes / yes | icon/tab filter color | WORKS END-TO-END for existing targets |
| Neon strength / `neonStrength` | yes / yes | filter alpha | WORKS END-TO-END for existing targets |
| Neon radius / `neonRadius` | yes / yes | filter radius capped at 8px | RENDERED WITH HARDCODED VALUE for radius >=16 |
| Neon opacity / `neonOpacity` | yes / yes | filter alpha | WORKS END-TO-END for existing targets |
| Motion enabled / `motionEnabled` | yes / yes | only activity items, tabs, buttons | PERSISTED BUT NOT RENDERED on other intended interactions |
| Motion strength / `motionStrength` | yes / yes | derived scale, narrow amplitude | rendered but real 0/50/100 transitions unverified |
| Spring / `motionSpring` | yes / yes | easing changes; duration fixed 220ms | RENDERED WITH HARDCODED VALUE for duration; real response unverified |

Harmony fields (`surfaceDepth`, `contrast`, `accentIntensity`, `inactiveFade`, `borderVisibility`, `activeTabIndicator`), typography, explicit syntax overrides and file-label choices already serialize and persist; they remain part of the complete configuration. Native layout and runtime rounding must become separate choices without deleting the user's previous layout preference.

Implementation plan: versioned canonical snapshot with legacy migration; full preset adapter alongside native export; shared radius/motion/glass roles; semantic runtime surface registry verified against 1.136.1; expanded real and packaged-VSIX tests. The Studio design remains the reference. Its only layout changes are the requested wider draggable controls and explicit import/export actions.
