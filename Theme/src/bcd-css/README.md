# How to use the bcd-css theme

## Loading

The theme is loaded automatically by `bcdui.js`, there is nothing to include on the page:

```html
<script type="text/javascript" src="bcdui/bcdui.js"></script>
```

`bcdui.js` adds `bcdui/theme/css/allStyles.css` (and the jQuery UI css) to the page.
Only with `bcdui.js?bcduiConfigOnly=true` you link the theme yourself, before `bcdui.js`:

```html
<link rel="stylesheet" type="text/css" href="bcdui/theme/css/allStyles.css"/>
<script type="text/javascript" src="bcdui/bcdui.js?bcduiConfigOnly=true"></script>
```

## Customizing

All settings of the theme are CSS custom properties in `bcd-variables.css`: colors, fonts, sizes, z-index base and so on.
Find it at https://github.com/businesscode/BCD-UI/blob/master/Theme/src/bcd-css/css/bcd-variables.css

1. Copy `bcd-variables.css` 1:1 into your project, of the BCD-UI version you use
2. Change the values you need, leave the others as they are
3. Load it after `bcdui.js`, followed by your own project css, if any

```html
<script type="text/javascript" src="bcdui/bcdui.js"></script>
<link rel="stylesheet" type="text/css" href="css/bcd-variables.css"/>
<link rel="stylesheet" type="text/css" href="css/project.css"/>
```

Keep the copy complete, even the values you did not change. When updating BCD-UI, compare your copy with the new
`bcd-variables.css` to see which variables were added, removed or got a new default, and take them over.
Otherwise your copy keeps the old defaults.

Some hints, see also the header of `bcd-variables.css`:
- Values like `var(--bcd-corporate-color)` or `hsl(from var(--bcd-select-color) ...)` follow the variable they refer to,
  changing `--bcd-corporate-color` changes buttons and selection as well. Replace them by a plain value to decouple them.
- `--bcd-text-on-*` is the text color on a colored background. Switch it between `--bcd-text-color-inverse`
  and `--bcd-text-color-default` when you make that background strong or plain.
- Keep the variables on `:root`. Variables derived from them are calculated there, setting a variable on a deeper element
  does not reach them.

## Dark color scheme

The theme comes with a light and a dark scheme, light is the default. `color-scheme` at the top of
`bcd-variables.css` selects the scheme: `light`, `dark`, or `light dark` to follow the setting of the operating system.
It also switches the browser's own controls and scrollbars.

Colors that differ between the schemes are given as `light-dark(<light>, <dark>)`. When you change such a color,
change both values:

```css
:root {
  color-scheme: light dark;
  --bcd-surface-color: light-dark(#ffffff, #1e1e1e);
}
```

Some parts bring their own styles and may not fully follow the dark scheme, for example the DE Grid or charts.

## Own styles

Your project css loaded after the theme wins over the theme's rules with the same specificity.
Use the BCD-UI classes in your own markup to get the theme's look:

| Class | Use |
|---|---|
| `bcdButton`, `bcdButton bcdPrimaryButton` | Buttons |
| `bcdFormControl` | Input fields and selects |
| `bcdFormGroup` | Label plus field |
| `bcdFlexRow` with `bcdFlexCol` / `bcdFlexAuto` | Rows with equal or content-sized columns |

## Bootstrap

The theme does not need Bootstrap. If your project uses Bootstrap for its own markup, load it before `bcdui.js`
and into a cascade layer, to avoid conflicts with the BCD-UI theme:

```html
<style>@import url("css/bootstrap.min.css") layer(bootstrap);</style>
<script type="text/javascript" src="bcdui/bcdui.js"></script>
```

## Browser support

At least autumn 2024 versions of Chrome, Edge, Firefox and Safari. The theme uses CSS nesting, `color-mix()` and relative colors (`hsl(from ...)`).
