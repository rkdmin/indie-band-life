// 화면 하나가 깨져도 백지가 되지 않게 한다. 저장은 시기마다 되어 있으니 다시 불러오면 된다.
import { Component, type ReactNode } from 'react';

interface State {
  err: Error | null;
}

export class CrashGuard extends Component<{ children: ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error) {
    console.error('[crash]', err);
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="crash-kicker">ERROR · 테이프가 씹혔다</div>
          <h2>잠깐, 테이프가 엉켰어요</h2>
          <p>화면을 그리다 문제가 생겼어요. 인생은 마지막 시기까지 저장되어 있으니 다시 불러오면 이어서 할 수 있어요.</p>
          <code>{this.state.err.message}</code>
          <div className="crash-actions">
            <button className="btn primary" onClick={() => location.reload()}>다시 불러오기</button>
            <button
              className="btn"
              onClick={() => {
                try {
                  localStorage.removeItem('ibl.save.v1');
                } catch {
                  /* 무시 */
                }
                location.reload();
              }}
            >
              이번 인생을 버리고 처음으로
            </button>
          </div>
        </div>
      </div>
    );
  }
}
