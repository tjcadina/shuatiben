/* 腾讯云开发 CloudBase 配置（刷题本云端账号同步）
 * env      : 云开发环境 ID（在云开发控制台首页可见）
 * region   : 地域，不填默认 ap-shanghai（上海）
 * clientId : 新版“身份认证(v2)”才需要；旧版“登录授权-邮箱登录”可留空
 * debounceMs: 本地改动后延迟多久自动上传云端（毫秒），一般不用改
 */
window.CLOUDBASE_CONFIG = {
  env: 'cadina-d1gwgvf2i28fff970',
  region: 'ap-shanghai',
  clientId: '',
  debounceMs: 1200
};
