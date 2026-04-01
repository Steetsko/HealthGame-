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

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return knownMessages[message] ?? message;
    }

    if (error.code === "ERR_NETWORK") {
      return "Не удалось связаться с сервером. Проверьте, что backend запущен и API доступен.";
    }
  }

  return fallback;
}
