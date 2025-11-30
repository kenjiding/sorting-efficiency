import { Users, BarChart3, Clock, TrendingUp } from 'lucide-react';

const StatisticsCards = ({ stats }) => {
  const cards = [
    {
      title: '总记录数',
      value: stats.totalRecords,
      icon: BarChart3,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: '工人数量',
      value: stats.totalWorkers,
      icon: Users,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: '平均粗拣效率',
      value: `${stats.avgCoarseEfficiency}/h`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      title: '平均细拣效率',
      value: `${stats.avgFineEfficiency}/h`,
      icon: TrendingUp,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    },
    {
      title: '总处理数量',
      value: `${stats.totalItems} 件`,
      icon: BarChart3,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: '总工作时长',
      value: `${stats.totalHours} h`,
      icon: Clock,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div 
            key={index}
            className={`${card.bgColor} rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow`}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`${card.color} p-3 rounded-lg mb-3`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatisticsCards; 