import { ArrowLeftOutlined, CloseOutlined, CommentOutlined, SendOutlined } from '@ant-design/icons'
import { Avatar, Button, Empty, Form, Input, Layout, List, notification, Spin, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { ChatList, MessageBox, ChatItem } from 'react-chat-elements'
import ReactMarkdown from 'react-markdown'
import { useHistory } from 'react-router'
import remarkGfm from 'remark-gfm'
import useSWR from 'swr'
import { apiUrl, fetcher, req } from '../../../utils/Fetcher'

import 'react-chat-elements/dist/main.css'
import prettyBytes from 'pretty-bytes'

interface Props {
  me?: any,
  collapsed?: boolean,
  parent?: any,
  setCollapsed: (data: boolean) => void
}

const Messaging: React.FC<Props> = ({ me, collapsed, parent, setCollapsed }) => {
  const [qVal, setQVal] = useState<string>()
  const [q, setQ] = useState<string>()
  const [messageText, setMessageText] = useState<string>()
  const [loadingSend, setLoadingSend] = useState<boolean>()
  const [message, setMessage] = useState<any>()
  const [chatList, setChatLists] = useState<any>()
  const [chatListOffset, setChatListOffset] = useState<number>()
  const [searchMessageList, setSearchMessageList] = useState<any>()
  const [searcGlobalList, setSearcGlobalList] = useState<any>()
  const [searchAccountList, setSearchAccountList] = useState<any>()
  const [messages, setMessages] = useState<any>()
  const [messagesOffset, setMessagesOffset] = useState<number>()
  const history = useHistory()

  const { data: dialogs } = useSWR(!collapsed && !q && !message ? `/dialogs?limit=10${chatListOffset ? `&offset=${chatListOffset}` : ''}` : null, fetcher, { onSuccess: data => {
    setChatListOffset(undefined)
    setChatLists([...chatList?.filter((dialog: any) => !data.dialogs.find((d: any) => d.id === dialog.id)) || [], ...data.dialogs || []])
  } })
  const { data: searchMessages } = useSWR(q ? `/messages/search?q=${q}&limit=10` : null, fetcher, { onSuccess: data => setSearchMessageList(data.messages || []) })
  const { data: searchGlobal } = useSWR(q ? `/messages/globalSearch?q=${q}&limit=5` : null, fetcher, { onSuccess: data => setSearcGlobalList(data.messages || []) })
  const { data: searchAccounts } = useSWR(q ? `/users/search?username=${q}&limit=10` : null, fetcher, { onSuccess: data => setSearchAccountList(data.users || []) })
  const { data: messageHistory, mutate: refetch } = useSWR(message && messagesOffset !== undefined  ? `/messages/history/${message.id}&limit=15&offset=${messagesOffset}` : null, fetcher, { onSuccess: data => {
    setMessagesOffset(0)
    return setMessages({
      ...messages,
      ...data.messages,
      messages: [...messages?.messages.filter((msg: any) => !data.messages.messages.find((newMsg: any) => newMsg.id === msg.id)) || [], ...data.messages.messages],
      users: [...messages?.users.filter((user: any) => !data.messages.users.find((newUser: any) => newUser.id === user.id)) || [], ...data.messages.users],
      chats: [...messages?.chats.filter((chat: any) => !data.messages.chats.find((newChat: any) => newChat.id === chat.id)) || [], ...data.messages.chats]
    })
  } })

  useEffect(() => {
    setSearchMessageList(undefined)
    setSearcGlobalList(undefined)
    setSearchAccountList(undefined)
  }, [q])

  useEffect(() => {
    setMessages(undefined)
    if (message) {
      setMessagesOffset(0)
      req.post(`/messages/read/${message.id}`).catch(() => {})
    }
  }, [message])

  useEffect(() => {
    if (messageHistory?.messages) {
      const sidebar = document.querySelector('.ant-layout-sider.ant-layout-sider-light.messaging')
      if (sidebar) {
        sidebar.scroll({ top: sidebar.clientHeight, behavior: 'smooth' })
      }
    }
  }, [messageHistory?.messages])

  const back = () => {
    if (message) {
      setMessage(undefined)
      setMessagesOffset(undefined)
    } else if (q) {
      setQ(undefined)
      setQVal(undefined)
    } else {
      setCollapsed(true)
    }
  }

  const download = async (msg: any) => {
    console.log(msg.id)
    const [type, others] = message.id.split('/')
    const [id, accessHash] = others.split('?accessHash=')
    const forwardKey = `${type}/${id}/${msg.id}/${accessHash}`
    const { data: files } = await req.get('/files', { params: { forward_info: forwardKey } })
    if (files?.files?.[0]) {
      const file = files?.files?.[0]
      return history.push(`/view/${file.id}`)
    }

    const { data } = await req.post(`/messages/forwardToMe/${msg.id}`, {}, {
      params: {
        type,
        peerId: id,
        accessHash
      }
    })
    const { data: file } = await req.post('/files', { file:
      {
        parent_id: parent?.link_id || parent?.id,
        forward_info: forwardKey,
        id: undefined
      }
    }, {
      params: {
        messageId: data.message.id
      }
    })

    return history.push(`/view/${file.file.id}`)
  }

  const sendMessage = async () => {
    if (!messageText) {
      return notification.error({
        message: 'Error',
        description: 'Please write your message first'
      })
    }

    setLoadingSend(true)
    try {
      await req.post(`/messages/send/${message?.id}`, { message: messageText })
      setMessageText(undefined)
    } catch (error: any) {
      setLoadingSend(false)
      return notification.error({
        message: 'Error',
        description: error?.response.data?.error || 'Something error, please try again.'
      })
    }
    refetch()
    return setLoadingSend(false)
  }

  return <Layout.Sider
    theme="light"
    className="messaging"
    trigger={null}
    collapsedWidth={0}
    collapsed={collapsed}
    onCollapse={setCollapsed}
    style={{ boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)', background: 'rgb(240, 242, 245) none repeat scroll 0% 0%', position: 'absolute', right: 0, width: '100%', height: '100%', overflowY: 'auto', zIndex: 1, marginBottom: 0 }}>
    <Layout.Header style={{ background: '#0088CC', position: 'fixed', zIndex: 2, width: '100%', paddingLeft: '15px' }}>
      <div key="logo" className="logo" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} size="large" type="link" style={{ color: '#fff' }} onClick={back} />
        {message ? <span><Avatar src={message?.avatar} /> &nbsp;{message?.title}</span> : 'Quick Message'}
      </div>
    </Layout.Header>
    <Layout.Content className="container" style={{ marginTop: '60px', marginBottom: '60px' }}>
      {message ? <>
        <Typography.Paragraph style={{ textAlign: 'center' }}>
          <Button shape="round" loading={!messageHistory} onClick={() => setMessagesOffset(messages?.messages.sort((a: any, b: any) => a.date - b.date)[0].id || 0)}>Load more</Button>
        </Typography.Paragraph>
        <List itemLayout="vertical" loading={!messageHistory} dataSource={messages?.messages.sort((a: any, b: any) => a.date - b.date).map((msg: any) => {
          let user = messages?.users.find((user: any) => user.id === (msg.fromId || msg.peerId)?.userId)
          if (!user) {
            user = messages?.chats.find((user: any) => user.id === (msg.fromId || msg.peerId)?.channelId)
          }

          const replyMsg = messages?.messages.find((msg: any) => msg.id === msg.replyTo?.replyToMsgId)
          let replyUser = replyMsg ? messages?.users.find((user: any) => user.id === (replyMsg.fromId || replyMsg.peerId)?.userId) : null
          if (!replyUser && replyMsg) {
            replyUser = messages?.chats.find((user: any) => user.id === (replyMsg.fromId || replyMsg.peerId)?.channelId)
          }

          let fileTitle: string | null = null
          let size: number = 0
          if ((msg?.media?.photo || msg?.media?.document) && !msg.message) {
            const mimeType = msg?.media?.photo ? 'image/jpeg' : msg?.media?.document.mimeType || 'unknown'
            fileTitle = msg?.media?.photo ? `${msg?.media?.photo.id}.jpg` : msg?.media?.document.attributes?.find((atr: any) => atr.fileName)?.fileName || `${msg?.media?.document.id}.${mimeType.split('/').pop()}`
            const getSizes = (data: any) => data?.sizes ? data?.sizes.pop() : data?.size
            size = msg?.media?.photo ? getSizes(msg?.media?.photo.sizes.pop()) : msg?.media?.document?.size
          }
          return msg.action?.className === 'MessageActionContactSignUp' ? {
            key: msg.id,
            type: 'system',
            date: msg.date * 1000,
            text: <><strong>{user ? user.title || `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown'}</strong> joined Telegram!</>
          } : msg.action?.className === 'MessageActionChatAddUser' ? {
            key: msg.id,
            type: 'system',
            date: msg.date * 1000,
            text: <><strong>{user ? user.title || `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown'}</strong> joined the group</>
          } : fileTitle ? {
            key: msg.id,
            position: me?.user.tg_id == user?.id ? 'right' : 'left',
            type: 'file',
            title: user ? user.title || `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
            titleColor: `#${`${user?.id.toString(16)}000000`.slice(0, 6)}`,
            text: fileTitle,
            date: msg.date * 1000,
            // forwarded: Boolean(msg.fwdFrom),
            onDownload: () => download(msg),
            data: {
              size: size ? prettyBytes(size) : undefined,
              status: {
                error: false,
                download: false,
                click: false
              },
              // message: msg
            }
          } : {
            key: msg.id,
            position: me?.user.tg_id == user?.id ? 'right' : 'left',
            type: 'text',
            title: user ? user.title || `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
            text: <ReactMarkdown className="messageItem" remarkPlugins={[remarkGfm]}>{msg.message?.replaceAll('\n', '  \n') || 'Unknown message'}</ReactMarkdown>,
            date: msg.date * 1000,
            titleColor: `#${`${user?.id.toString(16)}000000`.slice(0, 6)}`,
            // forwarded: Boolean(msg.fwdFrom),
            reply: replyMsg ? {
              title: replyUser ? replyUser.title || `${replyUser.firstName || ''} ${replyUser.lastName || ''}`.trim() : 'Unknown',
              titleColor: `#${`${replyUser?.id.toString(16)}000000`.slice(0, 6)}`,
              message: replyMsg.message || 'Unknown message'
            } : undefined
          }
        }) || []} renderItem={(item: any) => <List.Item key={item.key} style={{ padding: 0 }}><MessageBox {...item} /></List.Item>} />
        <Typography.Paragraph style={{ textAlign: 'center', marginTop: '15px' }}>
          <Button shape="round" type="link" loading={!messageHistory} onClick={() => refetch()}>Load recent messages...</Button>
        </Typography.Paragraph>
      </> : <>
        <Typography.Paragraph>
          <Input.Search value={qVal} onChange={(e) => setQVal(e.target.value)} className="input-search-round" placeholder="Search by username or message..." enterButton onSearch={setQ} allowClear />
        </Typography.Paragraph>

        {q && !message && <Tabs defaultActiveKey="accounts">
          <Tabs.TabPane tab="Accounts" key="accounts">
            {searchAccounts && !searchAccountList?.length && <Empty style={{ marginTop: '100px' }} />}
            <ChatList
              onClick={setMessage}
              dataSource={searchAccountList?.map((user: any) => {
                const title = `${user.firstName || ''} ${user.lastName || ''}`.trim()
                return {
                  id: `user/${user.id}?accessHash=${user?.accessHash}`,
                  key: user.id,
                  avatar: `${apiUrl}/messages/user/${user.id}/avatar.jpg?accessHash=${user?.accessHash}`,
                  alt: title?.split(' ')?.map((word: string) => word[0]).slice(0, 2).join('').toUpperCase(),
                  title: title,
                  subtitle: user.username ? `@${user.username}` : user.phone,
                  date: Date.now(),
                  unread: 0
                }
              }) || []}
            />
            {!searchAccounts && <Typography.Paragraph style={{ textAlign: 'center' }}><Spin spinning={true} /></Typography.Paragraph>}
          </Tabs.TabPane>
          <Tabs.TabPane tab="Messages" key="messages">
            {searchMessages && !searchMessageList?.messages?.length && <Empty style={{ marginTop: '100px' }} />}
            <ChatList
              onClick={setMessage}
              dataSource={searchMessageList?.messages.map((message: any) => {
                const user = message.peerId?.userId ? searchMessageList?.users.find((user: any) => user.id === message.peerId?.userId) : null
                const chat = message.peerId?.chatId ? searchMessageList?.chats.find((chat: any) => chat.id === message.peerId?.chatId) : null
                const title = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : chat?.title || ''
                return {
                  id: `${user ? 'user' : 'chat'}/${message.peerId?.userId || message.peerId?.chatId}?accessHash=${user?.accessHash || chat?.accessHash || chat?.migratedTo?.accessHash}`,
                  key: message.id,
                  avatar: `${apiUrl}/messages/${user ? 'user' : 'chat'}/${message.peerId?.userId || message.peerId?.chatId}/avatar.jpg?accessHash=${user?.accessHash || chat?.accessHash || chat?.migratedTo?.accessHash}`,
                  alt: title?.split(' ')?.map((word: string) => word[0]).slice(0, 2).join('').toUpperCase(),
                  title: title,
                  subtitle: message.message || 'Send Media',
                  date: message.date * 1000,
                  unread: 0
                }
              }) || []}
            />
            {!searchMessages && <Typography.Paragraph style={{ textAlign: 'center' }}><Spin spinning={true} /></Typography.Paragraph>}
          </Tabs.TabPane>
          <Tabs.TabPane tab="Global Search" key="globalSearch">
            {searchGlobal && !searcGlobalList?.messages?.length && <Empty style={{ marginTop: '100px' }} />}
            <ChatList
              onClick={setMessage}
              dataSource={searcGlobalList?.messages.map((message: any) => {
                const user = message.peerId?.userId ? searcGlobalList?.users.find((user: any) => user.id === message.peerId?.userId) : null
                const channel = message.peerId?.channelId || message.peerId?.chatId ? searcGlobalList?.chats.find((channel: any) => channel.id === (message.peerId?.channelId || message.peerId?.chatId)) : null
                const title = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : channel?.title || ''
                return {
                  id: `${user ? 'user' : 'channel'}/${message.peerId?.userId || message.peerId?.channelId}?accessHash=${user?.accessHash || channel?.accessHash || channel?.migratedTo?.accessHash}`,
                  key: message.id,
                  avatar: `${apiUrl}/messages/${user ? 'user' : message.peerId?.chatId ? 'chat' : 'channel'}/${message.peerId?.userId || message.peerId?.channelId || message.peerId?.chatId}/avatar.jpg?accessHash=${user?.accessHash || channel?.accessHash || channel?.migratedTo?.accessHash}`,
                  alt: title?.split(' ')?.map((word: string) => word[0]).slice(0, 2).join('').toUpperCase(),
                  title: title,
                  subtitle: message.message || 'Send Media',
                  date: message.date * 1000,
                  unread: 0
                }
              }) || []}
            />
            {!searchGlobal && <Typography.Paragraph style={{ textAlign: 'center' }}><Spin spinning={true} /></Typography.Paragraph>}
          </Tabs.TabPane>
        </Tabs>}

        {!q && !message && <>
          <List itemLayout="vertical" loading={!dialogs} loadMore={<Typography.Paragraph style={{ textAlign: 'center', marginTop: '15px' }}>
            <Button loading={!dialogs} onClick={() => setChatListOffset(chatList?.sort((a: any, b: any) => a.date - b.date)[0].date)} shape="round">Load more</Button>
          </Typography.Paragraph>} dataSource={chatList?.sort((a: any, b: any) => b.pinned === a.pinned ? b.date - a.date : b.pinned - a.pinned).map((dialog: any) => {
            return {
              id: `${dialog.isUser ? 'user' : 'channel'}/${dialog.entity?.id}?accessHash=${dialog.entity?.accessHash}`,
              key: dialog.id,
              avatar: `${apiUrl}/dialogs/${dialog.isUser ? 'user' : 'channel'}/${dialog.entity?.id}/avatar.jpg?accessHash=${dialog.entity.accessHash}`,
              alt: dialog.title?.split(' ')?.map((word: string) => word[0]).slice(0, 2).join('').toUpperCase(),
              title: dialog.title,
              subtitle: dialog.message.message || 'Unknown message',
              date: dialog.date * 1000,
              unread: dialog.dialog.unreadCount
            }
          }) || []} renderItem={(item: any) => <List.Item key={item.key} style={{ padding: 0 }}><ChatItem {...item} onClick={() => setMessage(item)} /></List.Item>} />
        </>}
      </>}
    </Layout.Content>
    {message ? <Layout.Footer style={{ padding: '20px 20px 5px', position: 'fixed', bottom: 0, width: document.querySelector('.ant-layout-sider.ant-layout-sider-light.messaging')?.clientWidth }}>
      <Form.Item style={{ display: 'inherit' }}>
        <Input.TextArea style={{ width: '89%', marginRight: '1%' }} autoSize value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message..." onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && (e.keyCode == 13 || e.keyCode == 10)) {
            sendMessage()
          }
        }} />
        <Button loading={loadingSend} icon={<SendOutlined />} shape="circle" type="primary" onClick={sendMessage} />
      </Form.Item>
    </Layout.Footer> : <Button shape="circle" size="large" style={{ position: 'fixed', right: 25, bottom: 20, ...collapsed ? {} : { display: 'none' } }} type="primary" icon={<CommentOutlined />} onClick={() => setCollapsed(!collapsed)} />}
  </Layout.Sider>
}

export default Messaging