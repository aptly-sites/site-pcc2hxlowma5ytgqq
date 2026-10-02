// Browser-only bridge for APIs that require a color string rather than CSS styling.
export function themeColor(name){
 const color=getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
 if(!color)throw Error(`Missing theme color: ${name}`);
 return color;
}
