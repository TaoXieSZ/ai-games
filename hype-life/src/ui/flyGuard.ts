// 甩卡动画期间的全局输入锁：防止卡牌飞出途中被键盘/连点二次结算。
export const flyGuard = {
  until: 0,
  lock(ms = 260) {
    this.until = Date.now() + ms;
  },
  get locked() {
    return Date.now() < this.until;
  },
};
