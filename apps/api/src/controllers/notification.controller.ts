import { Request, Response, NextFunction } from "express";
import { Notification } from "../models/notification.model.js";
import { AppError } from "../middleware/errorHandler.js";
import { emailService } from "../services/email/emailService.js";

/**
 * Lists the authenticated user's in-app notifications with unread count and pagination.
 */
export const getMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { recipientUserId: req.user.id };
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === "true";
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientUserId: req.user.id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((n) => n.toJSON()),
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns just the unread count for fast lightweight polling/header badges.
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const unreadCount = await Notification.countDocuments({
      recipientUserId: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks a single notification as read.
 */
export const markNotificationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      recipientUserId: req.user.id,
    });

    if (!notification) {
      return next(new AppError("Notification not found", 404, "NOT_FOUND"));
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      data: {
        notification: notification.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks all notifications for the authenticated user as read.
 */
export const markAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    await Notification.updateMany(
      { recipientUserId: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      data: {
        markedAllRead: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes or archives a notification belonging to the authenticated user.
 */
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const result = await Notification.findOneAndDelete({
      _id: id,
      recipientUserId: req.user.id,
    });

    if (!result) {
      return next(new AppError("Notification not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      success: true,
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns email provider configuration status and diagnostics.
 */
export const getEmailStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: emailService.getStatus(),
    });
  } catch (error) {
    next(error);
  }
};
