// 在浏览器控制台运行此脚本，查找并移除竖线元素
// 按 F12 -> Console，输入 allow pasting，然后粘贴此代码

console.log('=== 开始查找竖线元素 ===');

const uploadArea = document.querySelector('.upload-area-container');
if (!uploadArea) {
  console.error('未找到上传区域');
} else {
  console.log('找到上传区域');

  // 查找所有元素
  const allElements = uploadArea.querySelectorAll('*');
  console.log(`总共找到 ${allElements.length} 个元素`);

  // 查找窄而高的元素（可能是竖线）
  const suspiciousElements = [];
  allElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);

    // 查找宽度小于20px，高度大于50px的元素
    if (rect.width > 0 && rect.width < 20 && rect.height > 50) {
      suspiciousElements.push({
        element: el,
        index: index,
        tag: el.tagName,
        class: el.className,
        id: el.id,
        width: rect.width,
        height: rect.height,
        cursor: styles.cursor,
        display: styles.display,
        position: styles.position,
        zIndex: styles.zIndex,
        pointerEvents: styles.pointerEvents
      });
    }
  });

  console.log(`找到 ${suspiciousElements.length} 个可疑元素:`);
  suspiciousElements.forEach((item, i) => {
    console.log(`\n元素 ${i + 1}:`, {
      标签: item.tag,
      类名: item.class,
      ID: item.id,
      宽度: item.width,
      高度: item.height,
      光标: item.cursor,
      显示: item.display,
      位置: item.position,
      层级: item.zIndex
    });

    // 高亮这个元素
    item.element.style.outline = '5px solid red';
    item.element.style.outlineOffset = '2px';
  });

  if (suspiciousElements.length === 0) {
    console.log('未找到窄而高的元素');

    // 尝试查找所有有 pointer cursor 的元素
    console.log('\n=== 查找所有可点击元素 ===');
    const clickableElements = [];
    allElements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      if (styles.cursor === 'pointer') {
        clickableElements.push({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          text: el.textContent?.substring(0, 30)
        });
      }
    });

    console.log(`找到 ${clickableElements.length} 个可点击元素:`, clickableElements);
  }

  console.log('\n=== 已用红色边框标记所有可疑元素 ===');
  console.log('请查看页面上的红色边框，告诉我哪个是竖线');
}
