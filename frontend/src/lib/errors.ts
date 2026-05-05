import axios from "axios";

const knownMessages: Record<string, string> = {
  "Check-in for this habit and date already exists": "На эту дату привычка уже отмечена. Повторно засчитывать выполнение не нужно.",
  "Invalid credentials": "Неверный логин или пароль.",
  "User with provided credentials was not found": "Пользователь с такими данными не найден.",
  "Email is already registered": "Этот email уже используется в системе.",
  "Nickname is already registered": "Этот никнейм уже занят.",
  "Refresh token is expired or revoked": "Сессия истекла. Войдите снова.",
  "Refresh token was not found": "Сессия больше не активна. Войдите снова."
};

const fieldLabels: Record<string, string> = {
  email: "Email",
  phone: "Телефон",
  password: "Пароль",
  nickname: "Никнейм",
  firstName: "Имя",
  timezone: "Часовой пояс"
};

type ApiFieldError = {
  field?: string;
  message?: string;
};

function mapValidationMessage(field: string, message: string) {
  if (message.includes("must not be blank")) {
    return `${fieldLabels[field] ?? field} не должен быть пустым.`;
  }
  if (message.includes("must be a well-formed email address")) {
    return "Введите корректный email.";
  }
  if (message.includes("size must be between 8 and 72")) {
    return "Пароль должен содержать от 8 до 72 символов.";
  }
  if (message.includes("size must be between 3 and 64")) {
    return `${fieldLabels[field] ?? field} должен содержать от 3 до 64 символов.`;
  }
  if (message.includes("size must be between 0 and 100")) {
    return "Имя не должно быть длиннее 100 символов.";
  }
  if (message.includes("size must be between 0 and 64")) {
    return `${fieldLabels[field] ?? field} не должен быть длиннее 64 символов.`;
  }
  if (message.includes("must match")) {
    return "Телефон должен быть в формате +375291112233.";
  }
  return `${fieldLabels[field] ?? field}: ${message}`;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const fieldErrors = error.response?.data?.fieldErrors as ApiFieldError[] | undefined;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const firstError = fieldErrors[0];
      if (typeof firstError?.field === "string" && typeof firstError?.message === "string") {
        return mapValidationMessage(firstError.field, firstError.message);
      }
    }

    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      if (message === "Request validation failed") {
        return "Проверьте заполнение полей формы.";
      }
      return knownMessages[message] ?? message;
    }

    if (error.code === "ERR_NETWORK") {
      return "Не удалось связаться с сервером. Проверьте, что backend запущен и API доступен.";
    }
  }

  return fallback;
}
