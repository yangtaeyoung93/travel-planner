---
name: commit-message
description: 스테이지된 변경을 바탕으로 Conventional Commits 형식의 커밋 메세지를 2인 팀(author,reviewer)으로 생성한다. 'commit message', '커밋 메시지', '커밋 메세지 만들어줘' 등의 자연어로 요청 시 반드시 사용. 단, 이미 메세지가 작성된 `git commit -m` 대체는 아니다.
model: sonnet
allowed-tools: Read, Write, Bash
---

# commit-message skill

2인 팀으로 순차로 호출해 Conventional Commits 형식의 커밋 메세지를 생성하는 스킬

## Workflow

1. Precondition 체크
   `git diff -cached --quiet` 를 실행한다.
   exit code 1(변경있음)이면 통과, exit code 0(변경없음)이면 git init 안내 후 종료

2. autor 호출
   `commit-msg-author` 에이전트를 Agent 도구로 호출.
   출력은 `_workspace/commit-msg-draft.md`.
3. reviewer 호출
   `commit-msg-reviewer` 에이전트를 Agent 도구로 호출.
   호출 프롬프트에 "판정(PASS|REDO)·사유·수정 지시를 `_workspace/review-report.md`에 Write 도구로 반드시 저장하라"를 명시한다.
   (서브에이전트는 저장을 요청받지 않으면 리포트 파일을 만들지 않을 수 있다.)

4. 판정 분기
   `_workspace/review-report.md`의 `판정` 줄을 읽어 분기한다. 파일이 없거나 판정이 불명확하면 REDO로 처리한다.
   - PASS: `_workspace/commit-msg-draft.md`를 읽어 내용을 사용자에게 제시하고 완료.
   - REDO: reviewer 수정 지시를 프롬포트에 포함해 author 재호출(최대2회).
5. 루프 종료
   PASS 또는 재호출 2회 초과 시 종료.
   초과 시 "자동 승인 한계 도달 - 수동 검토 권장" 경고와 함께 마지막 draft를 사용자에게 제시하고 종료.
