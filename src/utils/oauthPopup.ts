export function openOAuthPopup(url: string, name = 'oauth', width = 600, height = 700) {
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const features = `width=${width},height=${height},left=${left},top=${top},status=0,scrollbars=1`;
  return window.open(url, name, features);
}
