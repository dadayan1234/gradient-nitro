const {normalizeConfig}=require('../out/config');
const settings=require('../docs/preview-theme.json');
function releasePreview(mode='dark') {
 const dark=settings['gradientNitro.visualConfig'];
 return normalizeConfig(mode==='dark'?dark:{...dark,themeMode:'light',baseColor:'#F6F3FA',accentColor:'#74639E',gradientStrength:.24,softlightColor:'#FFFFFF',editorSoftlight:.22,gradientStops:[
  {id:'midnight',color:'#C8D3EB',position:0,opacity:.9,softness:.95},
  {id:'plum',color:'#E4CBDD',position:100,opacity:.85,softness:.95}
 ]});
}
module.exports={releasePreview};
