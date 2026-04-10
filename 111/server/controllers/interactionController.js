/**
 * 互动交流模块控制器
 * 处理论坛主题、帖子回复、用户消息、反馈建议等相关业务逻辑
 */

// 导入数据库模型
// const InteractionModel = require('../models/interactionModel');

/**
 * 互动交流控制器方法
 */
const InteractionController = {
  /**
   * 获取论坛主题列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getForumTopicsList(req, res) {
    try {
      const { page = 1, limit = 20, category, author, sort } = req.query;
      // const topics = await InteractionModel.getForumTopics({
      //   page: parseInt(page),
      //   limit: parseInt(limit),
      //   category,
      //   author,
      //   sort
      // });
      
      // 模拟数据
      const topics = {
        items: [
          {
            id: 1,
            title: '讨论：如何提高刺绣效率？',
            content: '大家有什么提高刺绣效率的技巧吗？',
            excerpt: '分享刺绣效率提升的经验...',
            category: 'discussion',
            tags: ['技巧', '讨论', '交流'],
            author: { id: 1, name: '张三', avatar: '/uploads/avatars/user1.jpg' },
            replyCount: 24,
            viewCount: 156,
            lastReply: {
              author: { name: '李四' },
              time: '2026-03-03T14:30:00Z'
            },
            pinned: false,
            status: 'published',
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-03T14:30:00Z'
          },
          {
            id: 2,
            title: '求助：红旗刺绣针法问题',
            content: '在绣红旗时遇到针法问题，求指导',
            excerpt: '红旗刺绣中的针法技巧...',
            category: 'help',
            tags: ['求助', '针法', '问题'],
            author: { id: 2, name: '李四', avatar: '/uploads/avatars/user2.jpg' },
            replyCount: 12,
            viewCount: 89,
            lastReply: {
              author: { name: '王老师' },
              time: '2026-03-02T15:20:00Z'
            },
            pinned: true,
            status: 'published',
            createdAt: '2026-02-28T14:30:00Z'
          }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 1
        }
      };
      
      res.json({
        success: true,
        data: topics,
        message: '获取论坛主题列表成功'
      });
    } catch (error) {
      console.error('获取论坛主题列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取论坛主题列表失败'
      });
    }
  },

  /**
   * 获取主题详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTopicDetail(req, res) {
    try {
      const { id } = req.params;
      // const topic = await InteractionModel.getForumTopicById(id);
      
      // 模拟数据
      const topic = {
        id: parseInt(id),
        title: '讨论：如何提高刺绣效率？',
        content: '大家有什么提高刺绣效率的技巧吗？我在绣红旗时总是进度很慢...',
        category: 'discussion',
        tags: ['技巧', '讨论', '交流'],
        author: {
          id: 1,
          name: '张三',
          avatar: '/uploads/avatars/user1.jpg',
          title: '刺绣爱好者',
          joinDate: '2025-12-01'
        },
        replyCount: 24,
        viewCount: 156,
        lastReply: {
          author: { name: '李四' },
          time: '2026-03-03T14:30:00Z'
        },
        pinned: false,
        status: 'published',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-03T14:30:00Z',
        replies: [
          {
            id: 1,
            content: '我个人经验是先从简单的针法开始练习...',
            author: { id: 3, name: '王老师', avatar: '/uploads/avatars/teacher.jpg' },
            createdAt: '2026-03-01T14:30:00Z',
            likes: 15
          }
        ]
      };
      
      if (!topic) {
        return res.status(404).json({
          success: false,
          error: 'RESOURCE_NOT_FOUND',
          message: '主题不存在'
        });
      }
      
      res.json({
        success: true,
        data: topic,
        message: '获取主题详情成功'
      });
    } catch (error) {
      console.error('获取主题详情失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取主题详情失败'
      });
    }
  },

  /**
   * 创建论坛主题
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createForumTopic(req, res) {
    try {
      const topicData = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 验证必要字段
      if (!topicData.title || !topicData.content) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '标题和内容是必填字段'
        });
      }
      
      // 验证标题长度
      if (topicData.title.length < 5 || topicData.title.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '标题长度应在5-100字符之间'
        });
      }
      
      // const newTopic = await InteractionModel.createForumTopic({
      //   ...topicData,
      //   authorId: userId,
      //   status: 'published'
      // });
      
      // 模拟数据
      const newTopic = {
        id: Date.now(),
        ...topicData,
        authorId: userId,
        replyCount: 0,
        viewCount: 0,
        pinned: false,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: newTopic,
        message: '主题创建成功'
      });
    } catch (error) {
      console.error('创建主题失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '创建主题失败'
      });
    }
  },

  /**
   * 更新主题
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateTopic(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;
      
      // 验证权限
      // const topic = await InteractionModel.getForumTopicById(id);
      // if (!topic) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '主题不存在'
      //   });
      // }
      
      // 只有作者或管理员可以更新
      // if (topic.authorId !== userId && req.user?.role !== 'admin') {
      //   return res.status(403).json({
      //     success: false,
      //     error: 'FORBIDDEN',
      //     message: '没有权限修改此主题'
      //   });
      // }
      
      // const updatedTopic = await InteractionModel.updateForumTopic(id, updateData);
      
      // 模拟数据
      const updatedTopic = {
        id: parseInt(id),
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: updatedTopic,
        message: '主题更新成功'
      });
    } catch (error) {
      console.error('更新主题失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '更新主题失败'
      });
    }
  },

  /**
   * 删除主题
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteTopic(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // 验证权限逻辑同上...
      
      // await InteractionModel.deleteForumTopic(id);
      
      res.json({
        success: true,
        data: { id: parseInt(id) },
        message: '主题删除成功'
      });
    } catch (error) {
      console.error('删除主题失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '删除主题失败'
      });
    }
  },

  /**
   * 获取主题回复列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTopicReplies(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      // const replies = await InteractionModel.getTopicReplies(id, {
      //   page: parseInt(page),
      //   limit: parseInt(limit)
      // });
      
      // 模拟数据
      const replies = {
        items: [
          {
            id: 1,
            content: '我个人经验是先从简单的针法开始练习，熟练后再尝试复杂的红旗图案',
            author: {
              id: 3,
              name: '王老师',
              avatar: '/uploads/avatars/teacher.jpg',
              title: '刺绣非遗传承人'
            },
            createdAt: '2026-03-01T14:30:00Z',
            likes: 15,
            replies: [] // 二级回复
          },
          {
            id: 2,
            content: '推荐使用质量好的刺绣线和针，工具对效率影响很大',
            author: {
              id: 4,
              name: '李师傅',
              avatar: '/uploads/avatars/master.jpg'
            },
            createdAt: '2026-03-02T09:15:00Z',
            likes: 8
          }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 1
        }
      };
      
      res.json({
        success: true,
        data: replies,
        message: '获取回复列表成功'
      });
    } catch (error) {
      console.error('获取回复列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取回复列表失败'
      });
    }
  },

  /**
   * 发表回复
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createReply(req, res) {
    try {
      const { id } = req.params;
      const { content, parentId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '回复内容不能为空'
        });
      }
      
      // 验证主题存在
      // const topic = await InteractionModel.getForumTopicById(id);
      // if (!topic) {
      //   return res.status(404).json({
      //   success: false,
      //   error: 'RESOURCE_NOT_FOUND',
      //   message: '主题不存在'
      //   });
      // }
      
      // const reply = await InteractionModel.createReply({
      //   topicId: id,
      //   authorId: userId,
      //   content,
      //   parentId
      // });
      
      // 模拟数据
      const reply = {
        id: Date.now(),
        topicId: parseInt(id),
        authorId: userId,
        content,
        parentId,
        likes: 0,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: reply,
        message: '回复发表成功'
      });
    } catch (error) {
      console.error('发表回复失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '发表回复失败'
      });
    }
  },

  /**
   * 获取用户消息列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserMessages(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // const messages = await InteractionModel.getUserMessages(userId, {
      //   page: parseInt(page),
      //   limit: parseInt(limit)
      // });
      
      // 模拟数据
      const messages = {
        items: [
          {
            id: 1,
            sender: {
              id: 2,
              name: '李四',
              avatar: '/uploads/avatars/user2.jpg'
            },
            content: '你好，关于刺绣的问题想请教',
            read: false,
            createdAt: '2026-03-03T10:30:00Z'
          },
          {
            id: 2,
            sender: {
              id: 3,
              name: '王老师',
              avatar: '/uploads/avatars/teacher.jpg'
            },
            content: '你的作品已经通过初审',
            read: true,
            createdAt: '2026-03-02T14:20:00Z'
          }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 1
        }
      };
      
      res.json({
        success: true,
        data: messages,
        message: '获取消息列表成功'
      });
    } catch (error) {
      console.error('获取消息列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取消息列表失败'
      });
    }
  },

  /**
   * 发送私信
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async sendMessage(req, res) {
    try {
      const { recipientId, content } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 验证必要字段
      if (!recipientId || !content) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '收件人和内容是必填字段'
        });
      }
      
      // 不能给自己发消息
      if (recipientId === userId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '不能给自己发送消息'
        });
      }
      
      // 验证收件人存在
      // const recipientExists = await InteractionModel.checkUserExists(recipientId);
      // if (!recipientExists) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '收件人不存在'
      //   });
      // }
      
      // const message = await InteractionModel.createMessage({
      //   senderId: userId,
      //   recipientId,
      //   content
      // });
      
      // 模拟数据
      const message = {
        id: Date.now(),
        senderId: userId,
        recipientId,
        content,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: message,
        message: '消息发送成功'
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '发送消息失败'
      });
    }
  },

  /**
   * 标记消息为已读
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async markMessageAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // await InteractionModel.markMessageAsRead(id, userId);
      
      res.json({
        success: true,
        data: { messageId: parseInt(id) },
        message: '消息已标记为已读'
      });
    } catch (error) {
      console.error('标记消息失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '标记消息失败'
      });
    }
  },

  /**
   * 提交反馈建议
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async submitFeedback(req, res) {
    try {
      const { type, content, contact } = req.body;
      const userId = req.user?.id;
      
      // 验证必要字段
      if (!type || !content) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '类型和内容是必填字段'
        });
      }
      
      // 验证类型
      const validTypes = ['suggestion', 'bug', 'question', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `类型必须是: ${validTypes.join(', ')}`
        });
      }
      
      // const feedback = await InteractionModel.createFeedback({
      //   userId,
      //   type,
      //   content,
      //   contact
      // });
      
      // 模拟数据
      const feedback = {
        id: Date.now(),
        userId: userId || null,
        type,
        content,
        contact,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: feedback,
        message: '反馈提交成功，感谢您的宝贵意见'
      });
    } catch (error) {
      console.error('提交反馈失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '提交反馈失败'
      });
    }
  },

  /**
   * 获取热门主题
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getHotTopics(req, res) {
    try {
      // const hotTopics = await InteractionModel.getHotTopics();
      
      // 模拟数据
      const hotTopics = [
        {
          id: 1,
          title: '讨论：如何提高刺绣效率？',
          replyCount: 24,
          viewCount: 156,
          lastActivity: '2026-03-03T14:30:00Z'
        },
        {
          id: 2,
          title: '求助：红旗刺绣针法问题',
          replyCount: 12,
          viewCount: 89,
          lastActivity: '2026-03-02T15:20:00Z'
        },
        {
          id: 3,
          title: '分享：我的红旗刺绣作品',
          replyCount: 8,
          viewCount: 67,
          lastActivity: '2026-03-01T11:45:00Z'
        }
      ];
      
      res.json({
        success: true,
        data: hotTopics,
        message: '获取热门主题成功'
      });
    } catch (error) {
      console.error('获取热门主题失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取热门主题失败'
      });
    }
  },

  /**
   * 获取论坛统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getForumStats(req, res) {
    try {
      // const stats = await InteractionModel.getForumStats();
      
      // 模拟数据
      const stats = {
        totalTopics: 124,
        totalReplies: 876,
        totalMembers: 245,
        activeMembers: 87,
        newTopicsToday: 8,
        newRepliesToday: 24
      };
      
      res.json({
        success: true,
        data: stats,
        message: '获取论坛统计成功'
      });
    } catch (error) {
      console.error('获取论坛统计失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取论坛统计失败'
      });
    }
  }
};

module.exports = InteractionController;