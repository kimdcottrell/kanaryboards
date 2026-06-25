import type { Task } from "../context/types.ts";
import { createId } from "@lib/uuid.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

const initialDefaultColumnNames = ["To Do", "In Progress", "Review", "Done"];

export const createDemoBoard = () => {
  const rowId = createId();
  const columnOrders = generateNKeysBetween(
    null,
    null,
    initialDefaultColumnNames.length,
  );
  const columns = initialDefaultColumnNames.map((title, i) => ({
    id: createId(),
    title,
    order: columnOrders[i],
    pinned: title === "In Progress" || title === "Review",
    icon: null,
    iconInBoardMenu: title === "In Progress" || title === "Review",
  }));
  const todoColId = columns[0].id;
  const inProgressColId = columns[1].id;

  const task: Task = {
    id: createId(),
    rowId,
    colId: todoColId,
    order: generateKeyBetween(null, null),
    title: "Getting started",
    description: JSON.stringify({
      "root": {
        "children": [{
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "What does this do?",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "heading",
          "version": 1,
          "tag": "h1",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text":
              "Think of this as a really fancy todo board. You can use AI to do a lot of the grunt work, such as planning the tasks or checklist subtask items - or even some task execution!",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1,
      },
    }),
    checklist: (() => {
      const orders = generateNKeysBetween(null, null, 1);
      return [
        {
          id: createId(),
          text: "Click this card",
          checked: false,
          order: orders[0],
        },
      ];
    })(),
  };

  const signUpTask: Task = {
    id: createId(),
    rowId,
    colId: todoColId,
    order: generateKeyBetween(task.order, null),
    title: "Sign up to create more than one project row",
    description: JSON.stringify({
      "root": {
        "children": [{
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "It's free!",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "heading",
          "version": 1,
          "tag": "h1",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "You can make multiple rows for the low, low cost of ",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "free",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": " for a limited time only.",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Only by signing up can you make more than one row.",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1,
      },
    }),
    checklist: [],
  };

  const makeYourOwnBoardTask: Task = {
    id: createId(),
    rowId,
    colId: inProgressColId,
    order: generateKeyBetween(null, null),
    title: "Make your own board",
    description: JSON.stringify({
      "root": {
        "children": [{
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "How to start your own board",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "heading",
          "version": 1,
          "tag": "h1",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text":
              "In the section above, there is an input field with the text: ",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 16,
            "mode": "normal",
            "style": "",
            "text": "What do you want to do?",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "A ",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 16,
            "mode": "normal",
            "style": "",
            "text": "Get Started",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": " button is next to it.",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Fill out that form and hit the button.",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Important caveat",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "heading",
          "version": 1,
          "tag": "h2",
        }, {
          "children": [{
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text":
              "Boards created in this manner are not persisted outside of this browser session. You may lose your data. It is ",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "highly advised",
            "type": "text",
            "version": 1,
          }, {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text":
              " to either sign up shortly after your initial board creation so the board gets saved in a database. You can create more boards - or even your initial board - after signing up!",
            "type": "text",
            "version": 1,
          }],
          "direction": null,
          "format": "",
          "indent": 0,
          "type": "paragraph",
          "version": 1,
          "textFormat": 0,
          "textStyle": "",
        }],
        "direction": null,
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1,
      },
    }),
    checklist: (() => {
      const orders = generateNKeysBetween(null, null, 4);
      return [
        {
          id: createId(),
          text: "It's free!",
          checked: false,
          order: orders[0],
        },
        {
          id: createId(),
          text: "Sign up is optional (but encouraged)",
          checked: false,
          order: orders[1],
        },
        {
          id: createId(),
          text: 'Fill out the "What would you like to do" field above',
          checked: false,
          order: orders[2],
        },
        {
          id: createId(),
          text: 'Select the "Get Started" button',
          checked: false,
          order: orders[3],
        },
      ];
    })(),
  };

  return {
    rows: [{
      id: rowId,
      title: "Sample Project",
      color: "var(--color-row-blue)",
      order: generateKeyBetween(null, null),
    }],
    columns,
    tasks: [task, signUpTask, makeYourOwnBoardTask],
  };
};
