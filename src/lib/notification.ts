import { toast, ToastPosition } from "react-toastify";

export interface Notice {
  content: string;
  close?: number | false;
}

export class Notification {
  position: ToastPosition;
  constructor() {
    this.position = "top-right";
  }

  info = (message: Notice) => {
    toast.info(message.content, {
      position: this.position,
      autoClose: message.close,
      hideProgressBar: false,
      closeOnClick: true,
      draggable: true,
    });
  };

  warn = (message: Notice) => {
    toast.warn(message.content, {
      position: this.position,
      autoClose: message.close,
      hideProgressBar: false,
      closeOnClick: true,
      draggable: true,
    });
  };

  error = (message: Notice) => {
    toast.error(message.content, {
      position: this.position,
      autoClose: message.close,
      hideProgressBar: false,
      closeOnClick: true,
      draggable: true,
    });
  };
}

// export default new Notification();
